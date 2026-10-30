import 'server-only'
import pino from 'pino'
import pretty from 'pino-pretty'
import { env } from '@/lib/env'
import { createLogger } from './logger.utils'

const isProduction = process.env.NODE_ENV === 'production'

// Production: JSON lines, which Vercel Runtime Logs parse; error and fatal go to stderr so Vercel marks them as errors.
// Dev: pino-pretty as an in-process stream. No pino transports: they run in a worker thread that breaks in Next bundles.
const destination = isProduction
  ? pino.multistream(
      [
        {
          level: 'trace',
          stream: process.stdout,
        },
        {
          level: 'error',
          stream: process.stderr,
        },
      ],
      {
        dedupe: true,
      },
    )
  : pretty({
      colorize: true,
      translateTime: 'SYS:HH:MM:ss.l',
    })

// One logger per process; modules take a child: logger.child({ module: 'ledgers' })
export const logger = createLogger(env.LOG_LEVEL ?? (isProduction ? 'info' : 'debug'), destination)
