import { describe, expect, it } from 'vitest'
import { currencySymbol, formatMinor } from './money.utils'

// Intl puts no-break spaces between groups and before the sign; compare with plain spaces
const plain = (text: string) => text.replace(/\s/g, ' ')

describe('formatMinor', () => {
  it('formats minor units in the given locale', () => {
    expect(plain(formatMinor(123_456, 'UAH', 'uk'))).toBe('1 234,56 ₴')
    expect(plain(formatMinor(123_456, 'UAH', 'en'))).toBe('₴1,234.56')
    expect(plain(formatMinor(-80_000, 'EUR', 'uk'))).toBe('-800,00 €')
  })

  it('follows the currency exponent', () => {
    expect(formatMinor(500, 'JPY', 'en')).toBe('¥500')
  })

  it('keeps every digit of a bigint', () => {
    expect(formatMinor(BigInt('900719925474099312'), 'USD', 'en')).toBe('$9,007,199,254,740,993.12')
  })
})

describe('currencySymbol', () => {
  it('gives the narrow sign', () => {
    expect(currencySymbol('UAH', 'uk')).toBe('₴')
    expect(currencySymbol('EUR', 'en')).toBe('€')
  })
})
