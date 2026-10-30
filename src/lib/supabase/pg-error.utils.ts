// Postgres / PostgREST error codes → what the UI shows: the text is messages errors.db.<kind>. Constraint names
// follow `<table>_<rule>` (conventions §7), so forms map `constraint` to a field.
type PgErrorKind = 'forbidden' | 'conflict' | 'expired' | 'notFound' | 'duplicate' | 'invalid' | 'reference' | 'unknown'

export type PgError = {
  kind: PgErrorKind
  constraint: string | null
}

const KIND_BY_CODE: Record<string, PgErrorKind> = {
  '42501': 'forbidden', // RLS and write RPCs: viewer writes, foreign space
  PT409: 'conflict', // stale or missing `version` in RPCs: PostgREST answers HTTP 409
  PT410: 'expired', // accept_ledger_invite: expired, revoked or already used invite
  P0002: 'notFound', // RPC target row is gone (deleted on another device)
  '23505': 'duplicate',
  '23514': 'invalid', // incl. obligation_payments_within_operation from pay_obligation / update_operation
  '22023': 'invalid',
  '23503': 'reference', // incl. categories_parent_fkey (two levels), obligations_category_fkey (kind)
}

type PgErrorSource = {
  code?: string | null
  message?: string | null
}

export function toPgError(error: PgErrorSource): PgError {
  const kind = KIND_BY_CODE[error.code ?? ''] ?? 'unknown'
  const constraint = error.message?.match(/constraint "([^"]+)"/)?.[1] ?? null

  return {
    kind,
    constraint,
  }
}
