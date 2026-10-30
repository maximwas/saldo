import type { CURRENCIES } from '@/constants/currencies.constants'
import { listAccountOptions } from '@/lib/finance/ledger-options.api'
import type { SaldoClient } from '@/types/supabase.types'
import { type AddDebtMovementInput, addDebtMovementInputSchema } from '../schemas/add-debt-movement-input.schema'
import { type SaveDebtInput, saveDebtInputSchema } from '../schemas/save-debt-input.schema'
import { type DebtDirection, type DebtMovement, debtBalance } from '../utils/debts.utils'

type DebtStatus = 'open' | 'settled' | 'written_off'

export type DebtRow = {
  id: string
  direction: DebtDirection
  person: string
  reason: string | null
  principalMinor: number
  currency: (typeof CURRENCIES)[number]
  arisenOn: string
  accountId: string | null
  dueOn: string | null
  origin: 'new_movement' | 'existing_no_movement' | 'purchase_share'
  shareOfOperationId: string | null
  status: DebtStatus
  note: string | null
  version: number
  repaidMinor: number
  remainingMinor: number
  overpaidMinor: number
}

/** an expense a share of which can become a debt owed to me */
export type PurchaseOption = {
  id: string
  amountMinor: number
  currency: (typeof CURRENCIES)[number]
  occurredOn: string
  label: string
}

type DebtDbRow = {
  id: string
  direction: string
  person: string
  reason: string | null
  principal_minor: number
  currency: string
  arisen_on: string
  account_id: string | null
  due_on: string | null
  origin: string
  share_of_operation_id: string | null
  status: string
  note: string | null
  version: number
}

type MovementDbRow = {
  debt_id: string
  kind: string
  amount_minor: number
}

const DEBT_COLUMNS =
  'id, direction, person, reason, principal_minor, currency, arisen_on, account_id, due_on, origin, share_of_operation_id, status, note, version'
const PURCHASE_LIMIT = 20

const STATUS_ORDER: Record<DebtStatus, number> = {
  open: 0,
  settled: 1,
  written_off: 2,
}

function toDebtRow(row: DebtDbRow, movements: DebtMovement[]): DebtRow {
  return {
    id: row.id,
    direction: row.direction as DebtDirection,
    person: row.person,
    reason: row.reason,
    principalMinor: row.principal_minor,
    currency: row.currency as DebtRow['currency'],
    arisenOn: row.arisen_on,
    accountId: row.account_id,
    dueOn: row.due_on,
    origin: row.origin as DebtRow['origin'],
    shareOfOperationId: row.share_of_operation_id,
    status: row.status as DebtStatus,
    note: row.note,
    version: row.version,
    ...debtBalance(row.principal_minor, movements),
  }
}

/** open debts first (due date, then the oldest), settled and written-off after them */
const byStatusThenDue = (left: DebtRow, right: DebtRow) =>
  STATUS_ORDER[left.status] - STATUS_ORDER[right.status] ||
  (left.dueOn ?? '9999-12-31').localeCompare(right.dueOn ?? '9999-12-31') ||
  left.arisenOn.localeCompare(right.arisenOn)

export async function listDebts(supabase: SaldoClient, ledgerId: string): Promise<DebtRow[]> {
  const [debts, movements] = await Promise.all([
    supabase.from('debts').select(DEBT_COLUMNS).eq('ledger_id', ledgerId),
    supabase.from('debt_movements').select('debt_id, kind, amount_minor').eq('ledger_id', ledgerId),
  ])

  if (debts.error) {
    throw debts.error
  }

  if (movements.error) {
    throw movements.error
  }

  const byDebt = Map.groupBy(movements.data as MovementDbRow[], (movement) => movement.debt_id)

  return (debts.data as DebtDbRow[])
    .map((row) =>
      toDebtRow(
        row,
        (byDebt.get(row.id) ?? []).map((movement) => ({
          kind: movement.kind as DebtMovement['kind'],
          amountMinor: movement.amount_minor,
        })),
      ),
    )
    .sort(byStatusThenDue)
}

/** the latest expenses, for «a share of a purchase» */
export async function listPurchases(supabase: SaldoClient, ledgerId: string): Promise<PurchaseOption[]> {
  const { data, error } = await supabase
    .from('operations')
    .select('id, amount_minor, currency, occurred_on, counterparty, note')
    .eq('ledger_id', ledgerId)
    .eq('kind', 'expense')
    .order('occurred_on', { ascending: false })
    .order('occurred_at', { ascending: false })
    .limit(PURCHASE_LIMIT)

  if (error) {
    throw error
  }

  return data.map((row) => ({
    id: row.id,
    amountMinor: row.amount_minor,
    currency: row.currency as PurchaseOption['currency'],
    occurredOn: row.occurred_on,
    label: row.counterparty ?? row.note ?? '',
  }))
}

/** live accounts for the pickers */
export async function listDebtAccounts(supabase: SaldoClient, ledgerId: string) {
  const accounts = await listAccountOptions(supabase, ledgerId)

  return accounts.filter((account) => !account.archived)
}

export async function saveDebt(supabase: SaldoClient, rawInput: SaveDebtInput) {
  const input = saveDebtInputSchema.parse(rawInput)
  const { error } = await supabase.rpc('save_debt', {
    p_debt: input.debt,
    p_operation: input.operation ?? undefined,
  })

  if (error) {
    throw error
  }
}

export async function addDebtMovement(supabase: SaldoClient, rawInput: AddDebtMovementInput) {
  const input = addDebtMovementInputSchema.parse(rawInput)
  const { error } = await supabase.rpc('add_debt_movement', {
    p_movement: input.movement,
    p_operation: input.operation ?? undefined,
  })

  if (error) {
    throw error
  }
}

type CloseDebtParams = {
  /** the rest of the debt paid now; null when nothing is left to pay */
  repayment: AddDebtMovementInput | null
  status: SaveDebtInput
}

/** the frame: the remaining repayment (if any), then the status; both carry client ids, so a retry replays */
export async function closeDebt(supabase: SaldoClient, params: CloseDebtParams) {
  if (params.repayment) {
    await addDebtMovement(supabase, params.repayment)
  }

  await saveDebt(supabase, params.status)
}
