import { timingSafeEqual } from 'node:crypto'

// Vercel Cron sends `Authorization: Bearer <CRON_SECRET>`; a constant-time compare keeps the secret from leaking by timing
export function isCronAuthorized(authorization: string | null, secret: string): boolean {
  const expected = Buffer.from(`Bearer ${secret}`)
  const received = Buffer.from(authorization ?? '')

  if (received.length !== expected.length) {
    return false
  }

  return timingSafeEqual(received, expected)
}
