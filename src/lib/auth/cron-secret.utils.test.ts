import { describe, expect, it } from 'vitest'
import { isCronAuthorized } from '@/lib/auth/cron-secret.utils'

const SECRET = 'a'.repeat(64)

describe('isCronAuthorized', () => {
  it('accepts the exact bearer header', () => {
    expect(isCronAuthorized(`Bearer ${SECRET}`, SECRET)).toBe(true)
  })

  it('rejects a missing, bare or different secret', () => {
    expect(isCronAuthorized(null, SECRET)).toBe(false)
    expect(isCronAuthorized(SECRET, SECRET)).toBe(false)
    expect(isCronAuthorized(`Bearer ${'b'.repeat(64)}`, SECRET)).toBe(false)
    expect(isCronAuthorized(`Bearer ${SECRET}x`, SECRET)).toBe(false)
  })
})
