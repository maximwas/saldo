import { describe, expect, it } from 'vitest'
import { convertAt, convertMinor, type FxRate, findRate, scaleMinor, toFxRate } from './fx.utils'

type RateArgs = {
  pair: string
  value: string
  rateOn: string
  source?: FxRate['source']
}

const rate = ({ pair, value, rateOn, source = 'reference' }: RateArgs): FxRate => ({
  baseCurrency: pair.slice(0, 3),
  quoteCurrency: pair.slice(4),
  rate: value,
  rateOn,
  source,
})

describe('convertMinor', () => {
  it('converts minor units through the rate', () => {
    expect(convertMinor(-80_000, 'EUR', 'UAH', '41.5', 'half_up')).toBe(-3_320_000)
  })

  it('applies the requested rounding mode exactly once', () => {
    expect(convertMinor(1, 'UAH', 'USD', '0.5', 'half_up')).toBe(1)
    expect(convertMinor(1, 'UAH', 'USD', '0.5', 'half_even')).toBe(0)
    expect(convertMinor(3, 'UAH', 'USD', '0.5', 'half_even')).toBe(2)
    expect(convertMinor(3, 'UAH', 'USD', '0.5', 'down')).toBe(1)
    expect(convertMinor(-3, 'UAH', 'USD', '0.5', 'half_up')).toBe(-2)
  })
})

describe('findRate', () => {
  const rates = [
    rate({
      pair: 'EUR/UAH',
      value: '41.5',
      rateOn: '2026-10-29',
    }),
    rate({
      pair: 'EUR/UAH',
      value: '41.7',
      rateOn: '2026-10-30',
      source: 'manual',
    }),
    rate({
      pair: 'EUR/UAH',
      value: '41.6',
      rateOn: '2026-10-30',
    }),
    rate({
      pair: 'USD/UAH',
      value: '41.6',
      rateOn: '2026-10-30',
    }),
    rate({
      pair: 'EUR/UAH',
      value: '45',
      rateOn: '2026-11-02',
    }),
  ]

  it('takes the latest rate on or before the date, manual before reference on the same day', () => {
    expect(findRate(rates, 'EUR', 'UAH', '2026-10-30')?.toString()).toBe('41.7')
    expect(findRate(rates, 'EUR', 'UAH', '2026-10-29')?.toString()).toBe('41.5')
  })

  it('inverts a pair stored the other way round', () => {
    expect(convertAt(4_170, 'UAH', 'EUR', rates, '2026-10-30', 'half_up')).toBe(100)
  })

  it('builds a cross rate through a shared currency without rounding in between', () => {
    // 1 EUR = 41.7 UAH and 1 USD = 41.6 UAH, so 100 EUR = 100.2403... USD
    expect(convertAt(10_000, 'EUR', 'USD', rates, '2026-10-30', 'half_up')).toBe(10_024)
  })

  it('returns null for an unknown rate, never 0', () => {
    expect(findRate(rates, 'EUR', 'UAH', '2026-10-01')).toBeNull()
    expect(convertAt(10_000, 'PLN', 'UAH', rates, '2026-10-30', 'half_up')).toBeNull()
  })

  it('needs no rate for the same currency', () => {
    expect(convertAt(10_000, 'UAH', 'UAH', [], '2026-10-30', 'half_up')).toBe(10_000)
  })
})

describe('toFxRate', () => {
  it('maps the columns and keeps the rate exactly as PostgREST returned it', () => {
    expect(
      toFxRate({
        base_currency: 'EUR',
        quote_currency: 'UAH',
        rate: '41.5000000000',
        rate_on: '2026-10-01',
        source: 'reference',
      }),
    ).toEqual({
      baseCurrency: 'EUR',
      quoteCurrency: 'UAH',
      rate: '41.5000000000',
      rateOn: '2026-10-01',
      source: 'reference',
    })
  })
})

describe('scaleMinor', () => {
  it('divides exactly: 300.00 / 3 is 100.00, not 99.99 from a rounded 1/3', () => {
    expect(scaleMinor(30_000, 1, 3, 'down')).toBe(10_000)
  })

  it('applies the requested rounding mode once', () => {
    expect(scaleMinor(10_000, 1, 3, 'down')).toBe(3_333)
    expect(scaleMinor(5, 1, 2, 'half_up')).toBe(3)
    expect(scaleMinor(5, 1, 2, 'half_even')).toBe(2)
  })

  it('multiplies before it divides', () => {
    expect(scaleMinor(8_400, '365.2425', 84, 'half_up')).toBe(36_524)
  })

  it('refuses to divide by 0', () => {
    expect(() => scaleMinor(100, 1, 0, 'down')).toThrow(RangeError)
  })
})
