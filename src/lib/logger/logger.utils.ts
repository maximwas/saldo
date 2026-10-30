import pino, { type DestinationStream, type LevelWithSilent } from 'pino'

// Public repo, financial app: money, names, notes, contacts and credentials never reach the logs. Log ids, kinds,
// codes and durations instead; these keys are a safety net for objects passed whole by mistake.
const SECRET_KEYS = [
  'amount',
  'amountMinor',
  'amount_minor',
  'balance',
  'note',
  'notes',
  'email',
  'phone',
  'password',
  'token',
  'accessToken',
  'access_token',
  'refreshToken',
  'refresh_token',
  'cookie',
  'cookies',
  'authorization',
  'apiKey',
  'secret',
]

const REDACT_PATHS = SECRET_KEYS.flatMap((key) => [key, `*.${key}`, `*.*.${key}`])

export function createLogger(level: LevelWithSilent, destination: DestinationStream) {
  return pino(
    {
      level,
      base: null,
      timestamp: pino.stdTimeFunctions.isoTime,
      formatters: {
        level: (label) => ({
          level: label,
        }),
      },
      redact: {
        paths: REDACT_PATHS,
        censor: '[redacted]',
      },
    },
    destination,
  )
}
