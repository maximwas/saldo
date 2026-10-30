import { listAccountOptions, listCategoryOptions } from '@/lib/finance/ledger-options.api'
import type { SaldoClient } from '@/types/supabase.types'
import {
  type CreateObligationInput,
  createObligationInputSchema,
  type UpdateObligationInput,
  updateObligationInputSchema,
} from '../schemas/obligation-input.schema'
import { type PayObligationInput, payObligationInputSchema } from '../schemas/pay-obligation-input.schema'

type ObligationState = 'plan' | 'partial' | 'unconfirmed' | 'paid'

export type ObligationRow = {
  id: string
  title: string
  sourceType: string
  direction: 'in' | 'out'
  dueOn: string
  /** null = amount unknown (§7) */
  plannedMinor: number | null
  paidMinor: number
  remainingMinor: number | null
  currency: string
  accountId: string | null
  categoryId: string | null
  state: ObligationState
  version: number
  /** who confirmed the latest payment and when; null while nothing is paid */
  confirmedBy: string | null
  confirmedAt: string | null
}

export type ObligationOptions = {
  accounts: {
    id: string
    name: string
    currency: string
  }[]
  categories: {
    id: string
    name: string
    kind: 'income' | 'expense'
  }[]
}

export type CandidateOperation = {
  id: string
  accountId: string
  amountMinor: number
  currency: string
  occurredOn: string
  counterparty: string | null
  note: string | null
}

export type ObligationPayment = {
  id: string
  operationId: string
  amountMinor: number
  createdAt: string
  operation: CandidateOperation | null
}

type CandidateParams = {
  ledgerId: string
  direction: 'in' | 'out'
}

type DeletePaymentParams = {
  paymentId: string
  deleteOperation: boolean
}

const OPEN_STATES = ['plan', 'partial', 'unconfirmed']
const PAID_LIMIT = 10
const CANDIDATE_LIMIT = 10
const STATE_COLUMNS =
  'obligation_id, title, source_type, direction, due_on, planned_amount_minor, paid_minor, remaining_minor, currency, account_id, category_id, state, version'

type StateRow = {
  obligation_id: string
  title: string
  source_type: string
  direction: string
  due_on: string
  planned_amount_minor: number | null
  paid_minor: number
  remaining_minor: number | null
  currency: string
  account_id: string | null
  category_id: string | null
  state: string
  version: number
}

function toObligationRow(row: StateRow): ObligationRow {
  return {
    id: row.obligation_id,
    title: row.title,
    sourceType: row.source_type,
    direction: row.direction as 'in' | 'out',
    dueOn: row.due_on,
    plannedMinor: row.planned_amount_minor,
    paidMinor: row.paid_minor,
    remainingMinor: row.remaining_minor,
    currency: row.currency,
    accountId: row.account_id,
    categoryId: row.category_id,
    state: row.state as ObligationState,
    version: row.version,
    confirmedBy: null,
    confirmedAt: null,
  }
}

/** the newest payment of each obligation carries the confirmer: obligation_payments.created_by */
async function withLatestPayments(supabase: SaldoClient, rows: ObligationRow[]): Promise<ObligationRow[]> {
  const withPayments = rows.filter((row) => row.paidMinor > 0).map((row) => row.id)

  if (withPayments.length === 0) {
    return rows
  }

  const { data, error } = await supabase
    .from('obligation_payments')
    .select('obligation_id, created_by, created_at')
    .in('obligation_id', withPayments)
    .order('created_at', { ascending: false })

  if (error) {
    throw error
  }

  const latest = new Map<
    string,
    {
      createdBy: string | null
      createdAt: string
    }
  >()

  for (const payment of data) {
    if (!latest.has(payment.obligation_id)) {
      latest.set(payment.obligation_id, {
        createdBy: payment.created_by,
        createdAt: payment.created_at,
      })
    }
  }

  return rows.map((row) => ({
    ...row,
    confirmedBy: latest.get(row.id)?.createdBy ?? null,
    confirmedAt: latest.get(row.id)?.createdAt ?? null,
  }))
}

/** open obligations (plan / partial / date passed) oldest first, plus the last paid ones so a payment can be cancelled */
export async function listObligations(supabase: SaldoClient, ledgerId: string) {
  const [open, paid] = await Promise.all([
    supabase
      .from('obligation_states')
      .select(STATE_COLUMNS)
      .eq('ledger_id', ledgerId)
      .in('state', OPEN_STATES)
      .order('due_on'),
    supabase
      .from('obligation_states')
      .select(STATE_COLUMNS)
      .eq('ledger_id', ledgerId)
      .eq('state', 'paid')
      .order('due_on', { ascending: false })
      .limit(PAID_LIMIT),
  ])

  if (open.error) {
    throw open.error
  }

  if (paid.error) {
    throw paid.error
  }

  const [openRows, paidRows] = await Promise.all([
    withLatestPayments(
      supabase,
      (open.data ?? []).map((row) => toObligationRow(row as StateRow)),
    ),
    withLatestPayments(
      supabase,
      (paid.data ?? []).map((row) => toObligationRow(row as StateRow)),
    ),
  ])

  return {
    open: openRows,
    paid: paidRows,
  }
}

/** account and category pick lists of the form and the pay sheet: live ones only */
export async function listObligationOptions(supabase: SaldoClient, ledgerId: string): Promise<ObligationOptions> {
  const [accounts, categories] = await Promise.all([
    listAccountOptions(supabase, ledgerId),
    listCategoryOptions(supabase, ledgerId),
  ])

  return {
    accounts: accounts.filter((account) => !account.archived),
    categories: categories.filter((category) => !category.archived),
  }
}

const OPERATION_COLUMNS = 'id, account_id, amount_minor, currency, occurred_on, counterparty, note'

type OperationRow = {
  id: string
  account_id: string
  amount_minor: number
  currency: string
  occurred_on: string
  counterparty: string | null
  note: string | null
}

const toCandidate = (row: OperationRow): CandidateOperation => ({
  id: row.id,
  accountId: row.account_id,
  amountMinor: row.amount_minor,
  currency: row.currency,
  occurredOn: row.occurred_on,
  counterparty: row.counterparty,
  note: row.note,
})

/** recent operations that the «Paid» sheet may link: the same direction as the obligation, no transfers */
export async function listCandidateOperations(
  supabase: SaldoClient,
  params: CandidateParams,
): Promise<CandidateOperation[]> {
  const { data, error } = await supabase
    .from('operations')
    .select(OPERATION_COLUMNS)
    .eq('ledger_id', params.ledgerId)
    .eq('direction', params.direction)
    .in('kind', ['income', 'expense'])
    .order('occurred_on', { ascending: false })
    .order('occurred_at', { ascending: false })
    .limit(CANDIDATE_LIMIT)

  if (error) {
    throw error
  }

  return (data ?? []).map(toCandidate)
}

export async function listObligationPayments(
  supabase: SaldoClient,
  obligationId: string,
): Promise<ObligationPayment[]> {
  const payments = await supabase
    .from('obligation_payments')
    .select('id, operation_id, amount_minor, created_at')
    .eq('obligation_id', obligationId)
    .order('created_at', { ascending: false })

  if (payments.error) {
    throw payments.error
  }

  const ids = (payments.data ?? []).map((row) => row.operation_id)
  const operations = ids.length > 0 ? await supabase.from('operations').select(OPERATION_COLUMNS).in('id', ids) : null

  if (operations?.error) {
    throw operations.error
  }

  const byId = new Map((operations?.data ?? []).map((row) => [row.id, toCandidate(row)]))

  return (payments.data ?? []).map((row) => ({
    id: row.id,
    operationId: row.operation_id,
    amountMinor: row.amount_minor,
    createdAt: row.created_at,
    operation: byId.get(row.operation_id) ?? null,
  }))
}

export async function createObligation(supabase: SaldoClient, input: CreateObligationInput) {
  const { error } = await supabase.from('obligations').insert(createObligationInputSchema.parse(input))

  if (error) {
    throw error
  }
}

/** versioned update under RLS: nothing matched = someone changed or removed it (PT409 for the caller) */
export async function updateObligation(supabase: SaldoClient, input: UpdateObligationInput) {
  const { id, ledger_id: _ledgerId, expectedVersion, ...fields } = updateObligationInputSchema.parse(input)
  const { data, error } = await supabase
    .from('obligations')
    .update(fields)
    .eq('id', id)
    .eq('version', expectedVersion)
    .select('id')

  if (error) {
    throw error
  }

  if (data.length === 0) {
    throw {
      code: 'PT409',
      message: 'obligation was changed by someone else',
    }
  }
}

/** «Paid»: one new operation or a link to an existing one, through pay_obligation (obligation_payments is read-only) */
export async function payObligation(supabase: SaldoClient, rawInput: PayObligationInput) {
  const input = payObligationInputSchema.parse(rawInput)
  const { error } = await supabase.rpc('pay_obligation', {
    p_payment_id: input.paymentId,
    p_obligation_id: input.obligationId,
    p_expected_version: input.expectedVersion,
    p_amount_minor: input.amountMinor,
    p_operation: input.newOperation ?? undefined,
    p_existing_operation_id: input.existingOperationId ?? undefined,
    p_settle: input.settle,
  })

  if (error) {
    throw error
  }
}

export async function deleteObligationPayment(supabase: SaldoClient, params: DeletePaymentParams) {
  const { error } = await supabase.rpc('delete_obligation_payment', {
    p_payment_id: params.paymentId,
    p_delete_operation: params.deleteOperation,
  })

  if (error) {
    throw error
  }
}
