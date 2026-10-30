import { type LedgerAccountOption, listAccountOptions } from '@/lib/finance/ledger-options.api'
import type { SaldoClient } from '@/types/supabase.types'
import {
  type ReplaceCreditScheduleInput,
  replaceCreditScheduleInputSchema,
} from '../schemas/replace-credit-schedule-input.schema'
import { type SaveCreditInput, saveCreditInputSchema } from '../schemas/save-credit-input.schema'

/** obligation_states.state of an installment; replaced / cancelled ones stay as history (§9) */
export type InstallmentState = 'plan' | 'partial' | 'unconfirmed' | 'paid' | 'replaced' | 'cancelled'

export type CreditInstallment = {
  id: string
  sequenceNo: number
  dueOn: string
  /** null = amount unknown (§7), never 0 */
  plannedMinor: number | null
  paidMinor: number
  remainingMinor: number | null
  state: InstallmentState
}

export type Credit = {
  id: string
  name: string
  lender: string | null
  purchasePriceMinor: number | null
  totalPayableMinor: number | null
  currency: string
  openedOn: string | null
  installmentsCount: number
  regularInstallmentMinor: number | null
  lastInstallmentMinor: number | null
  accountId: string | null
  feesNote: string | null
  scheduleAccuracy: 'bank_confirmed' | 'estimated'
  /** installments paid before tracking: no rows and no operations (§25) */
  paidBeforeTrackingCount: number
  paidBeforeTrackingMinor: number | null
  status: 'active' | 'closed' | 'cancelled'
  version: number
  /** by number, the active one before the ones it replaced */
  installments: CreditInstallment[]
}

export type CreditList = {
  credits: Credit[]
  accounts: LedgerAccountOption[]
}

const CREDIT_COLUMNS =
  'id, name, lender, purchase_price_minor, total_payable_minor, currency, opened_on, installments_count, regular_installment_minor, last_installment_minor, account_id, fees_note, schedule_accuracy, paid_before_tracking_count, paid_before_tracking_minor, status, version'
const INSTALLMENT_COLUMNS =
  'obligation_id, source_id, sequence_no, due_on, planned_amount_minor, paid_minor, remaining_minor, state'

type CreditRow = {
  id: string
  name: string
  lender: string | null
  purchase_price_minor: number | null
  total_payable_minor: number | null
  currency: string
  opened_on: string | null
  installments_count: number
  regular_installment_minor: number | null
  last_installment_minor: number | null
  account_id: string | null
  fees_note: string | null
  schedule_accuracy: string
  paid_before_tracking_count: number
  paid_before_tracking_minor: number | null
  status: string
  version: number
}

type InstallmentRow = {
  obligation_id: string
  source_id: string | null
  sequence_no: number | null
  due_on: string
  planned_amount_minor: number | null
  paid_minor: number | null
  remaining_minor: number | null
  state: string | null
}

const toInstallment = (row: InstallmentRow): CreditInstallment => ({
  id: row.obligation_id,
  sequenceNo: row.sequence_no ?? 0,
  dueOn: row.due_on,
  plannedMinor: row.planned_amount_minor,
  paidMinor: row.paid_minor ?? 0,
  remainingMinor: row.remaining_minor,
  state: (row.state ?? 'plan') as InstallmentState,
})

const toCredit = (row: CreditRow, installments: CreditInstallment[]): Credit => ({
  id: row.id,
  name: row.name,
  lender: row.lender,
  purchasePriceMinor: row.purchase_price_minor,
  totalPayableMinor: row.total_payable_minor,
  currency: row.currency,
  openedOn: row.opened_on,
  installmentsCount: row.installments_count,
  regularInstallmentMinor: row.regular_installment_minor,
  lastInstallmentMinor: row.last_installment_minor,
  accountId: row.account_id,
  feesNote: row.fees_note,
  scheduleAccuracy: row.schedule_accuracy as Credit['scheduleAccuracy'],
  paidBeforeTrackingCount: row.paid_before_tracking_count,
  paidBeforeTrackingMinor: row.paid_before_tracking_minor,
  status: row.status as Credit['status'],
  version: row.version,
  installments,
})

function bySource(rows: InstallmentRow[]): Map<string, CreditInstallment[]> {
  const grouped = new Map<string, CreditInstallment[]>()

  for (const row of rows) {
    const list = grouped.get(row.source_id ?? '') ?? []

    list.push(toInstallment(row))
    grouped.set(row.source_id ?? '', list)
  }

  return grouped
}

/** credits of the space, active first, with every installment (history included) and the account names */
export async function listCredits(supabase: SaldoClient, ledgerId: string): Promise<CreditList> {
  const [credits, installments, accounts] = await Promise.all([
    supabase.from('credits').select(CREDIT_COLUMNS).eq('ledger_id', ledgerId).order('status').order('created_at'),
    supabase
      .from('obligation_states')
      .select(INSTALLMENT_COLUMNS)
      .eq('ledger_id', ledgerId)
      .eq('source_type', 'credit')
      .order('sequence_no')
      .order('lifecycle'),
    listAccountOptions(supabase, ledgerId),
  ])

  if (credits.error) {
    throw credits.error
  }

  if (installments.error) {
    throw installments.error
  }

  const grouped = bySource(installments.data ?? [])

  return {
    credits: (credits.data ?? []).map((row) => toCredit(row, grouped.get(row.id) ?? [])),
    accounts,
  }
}

/** create (with its schedule) or edit a credit; never writes an operation: the purchase price is not an expense (§9) */
export async function saveCredit(supabase: SaldoClient, raw: SaveCreditInput) {
  const input = saveCreditInputSchema.parse(raw)
  const { data, error } = await supabase.rpc('save_credit', {
    p_credit: input.credit,
    p_installments: input.installments,
  })

  if (error) {
    throw error // PT409 → conflict, 22023 → numbers out of range, see pg-error.utils
  }

  return data
}

export async function replaceCreditSchedule(supabase: SaldoClient, raw: ReplaceCreditScheduleInput) {
  const input = replaceCreditScheduleInputSchema.parse(raw)
  const { data, error } = await supabase.rpc('replace_credit_schedule', {
    p_credit_id: input.creditId,
    p_expected_version: input.expectedVersion,
    p_installments: input.installments,
  })

  if (error) {
    throw error
  }

  return data
}
