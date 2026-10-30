import { describe, expect, it } from 'vitest'
import { formatRate, impliedRate } from './rate.utils'

describe('impliedRate', () => {
  it('derives the rate from the real amounts of both accounts', () => {
    expect(impliedRate(80_000, 'EUR', 3_320_000, 'UAH')?.toString()).toBe('41.5')
  })

  it('is null for a missing or zero amount', () => {
    expect(impliedRate(0, 'EUR', 3_320_000, 'UAH')).toBeNull()
    expect(impliedRate(80_000, 'EUR', 0, 'UAH')).toBeNull()
  })
})

describe('formatRate', () => {
  it('keeps at least two decimals and trims to four', () => {
    expect(formatRate(impliedRate(80_000, 'EUR', 3_320_000, 'UAH') as never, 'en')).toBe('41.50')
    expect(formatRate(impliedRate(300, 'USD', 12_480, 'UAH') as never, 'en')).toBe('41.60')
    expect(formatRate(impliedRate(300, 'USD', 12_481, 'UAH') as never, 'en')).toBe('41.6033')
  })
})
