import type { SaldoClient } from '@/types/supabase.types'

/** the server's side of a conflict: the row as it is now (or the payment that came first) */
export type ServerVersion = {
  fields: Record<string, unknown>
  /** the row's current version: «keep mine» sends the same change against it */
  version: number | null
  changedAt: string | null
  /** user id; known for a payment (obligation_payments.created_by), not for an edited row */
  changedBy: string | null
}

// [feature, write] keys whose input carries the row id: the conflict compares with that row as it is now
const VERSIONED_TABLES = {
  operations: 'operations',
  obligations: 'obligations',
  accounts: 'accounts',
  categories: 'categories',
  subscriptions: 'subscriptions',
  credits: 'credits',
  debts: 'debts',
} as const

type VersionedTable = (typeof VERSIONED_TABLES)[keyof typeof VERSIONED_TABLES]

async function currentRow(supabase: SaldoClient, table: VersionedTable, id: string): Promise<ServerVersion | null> {
  const { data, error } = await supabase.from(table).select('*').eq('id', id).maybeSingle()

  if (error) {
    throw error
  }

  if (!data) {
    return null
  }

  const row = data as Record<string, unknown>

  return {
    fields: row,
    version: typeof row.version === 'number' ? row.version : null,
    changedAt: typeof row.updated_at === 'string' ? row.updated_at : null,
    changedBy: null,
  }
}

/** a payment conflict: the payment that reached the server first, with its operation and its author */
async function latestPayment(supabase: SaldoClient, obligationId: string): Promise<ServerVersion | null> {
  const payment = await supabase
    .from('obligation_payments')
    .select('operation_id, created_at, created_by')
    .eq('obligation_id', obligationId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (payment.error) {
    throw payment.error
  }

  if (!payment.data) {
    return null
  }

  const operation = await currentRow(supabase, 'operations', payment.data.operation_id)

  return {
    fields: operation?.fields ?? {},
    version: null,
    changedAt: payment.data.created_at,
    changedBy: payment.data.created_by,
  }
}

type ConflictTarget = {
  key: readonly unknown[]
  variables: unknown
}

/** what the server has now for a queued write that came back PT409; null when the row is gone or unknown */
export function getServerVersion(supabase: SaldoClient, { key, variables }: ConflictTarget) {
  const input = (variables ?? {}) as Record<string, unknown>
  const [feature, write] = key

  if (feature === 'obligations' && write === 'payObligation') {
    return latestPayment(supabase, String(input.obligationId))
  }

  const table = VERSIONED_TABLES[feature as keyof typeof VERSIONED_TABLES]

  return table && typeof input.id === 'string' ? currentRow(supabase, table, input.id) : Promise.resolve(null)
}
