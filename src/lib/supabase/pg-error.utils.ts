// Postgres / PostgREST error codes → what the UI shows: the text is messages errors.db.<kind>. Constraint names
// follow `<table>_<rule>` (conventions §7), so forms map `constraint` to a field.
type PgErrorKind = 'forbidden' | 'conflict' | 'duplicate' | 'invalid' | 'reference' | 'unknown'

export type PgError = { kind: PgErrorKind; constraint: string | null }

const KIND_BY_CODE: Record<string, PgErrorKind> = {
  '42501': 'forbidden', // RLS: viewer writes, foreign space
  PT409: 'conflict', // stale `version` in RPCs: PostgREST answers HTTP 409
  '23505': 'duplicate',
  '23514': 'invalid',
  '22023': 'invalid',
  '23503': 'reference',
}

export function toPgError(error: { code?: string | null; message?: string | null }): PgError {
  const kind = KIND_BY_CODE[error.code ?? ''] ?? 'unknown'
  const constraint = error.message?.match(/constraint "([^"]+)"/)?.[1] ?? null

  return { kind, constraint }
}
