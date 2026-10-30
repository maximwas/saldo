import 'server-only'
import type { Logger } from 'pino'
import { type PgError, toPgError } from './pg-error.utils'

type PgErrorDetails = {
  code?: string | null
  message?: string | null
}

// The UI shows only errors.db.<kind>; the original Postgres code and constraint stay in the server log. The message
// is not logged: Postgres puts row values into it ("Key (email)=(...) already exists").
export function logPgError(log: Logger, error: PgErrorDetails, message: string): PgError {
  const pgError = toPgError(error)

  log.error(
    {
      code: error.code ?? null,
      kind: pgError.kind,
      constraint: pgError.constraint,
    },
    message,
  )

  return pgError
}
