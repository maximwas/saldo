import { describe, expect, it } from 'vitest'
import { DEVICE_CACHE_MAX_AGE } from './query-client'

describe('DEVICE_CACHE_MAX_AGE', () => {
  // gcTime runs through setTimeout: above 2^31 - 1 ms it fires at once and every unused query is dropped
  it('fits a 32-bit timer', () => {
    expect(DEVICE_CACHE_MAX_AGE).toBeLessThan(2 ** 31)
  })
})
