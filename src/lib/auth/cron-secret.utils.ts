import { timingSafeEqual } from 'node:crypto'

// The Worker's Cron Trigger (worker.ts) and pg_cron send `Authorization: Bearer <CRON_SECRET>`; a constant-time compare keeps the secret from leaking by timing
export function isCronAuthorized(authorization: string | null, secret: string): boolean {
  const expected = Buffer.from(`Bearer ${secret}`)
  const received = Buffer.from(authorization ?? '')

  if (received.length !== expected.length) {
    return false
  }

  return timingSafeEqual(received, expected)
}
