import { describe, expect, it } from 'vitest'
import { amountText, currencyName, currencySymbol, formatMinor, fromMinor, toMinor } from './money.utils'

// Intl puts no-break spaces between groups and before the sign; compare with plain spaces
const plain = (text: string) => text.replace(/\s/g, ' ')

describe('formatMinor', () => {
  it('formats minor units in the given locale', () => {
    expect(plain(formatMinor(123_456, 'UAH', 'uk'))).toBe('1 234,56 ₴')
    expect(plain(formatMinor(123_456, 'UAH', 'en'))).toBe('₴1,234.56')
    expect(plain(formatMinor(-80_000, 'EUR', 'uk'))).toBe('−800,00 €')
    expect(formatMinor(-500, 'USD', 'en')).toBe('−$5.00')
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

  it('keeps «$» for the US dollar only: another dollar shows its own sign', () => {
    expect(currencySymbol('USD', 'uk')).toBe('$')
    expect(currencySymbol('CAD', 'uk')).toBe('CAD')
    expect(currencySymbol('CAD', 'en')).toBe('CA$')
  })
})

describe('toMinor', () => {
  it('parses a typed amount into integer minor units', () => {
    expect(toMinor('1234,56', 'UAH')).toBe(123_456)
    expect(toMinor('1 234.5', 'USD')).toBe(123_450)
    expect(toMinor('800', 'EUR')).toBe(80_000)
    expect(toMinor('−0,01', 'UAH')).toBe(-1)
  })

  it('rejects text and more fraction digits than the currency has instead of rounding', () => {
    expect(toMinor('12,345', 'UAH')).toBeNull()
    expect(toMinor('abc', 'UAH')).toBeNull()
    expect(toMinor('', 'UAH')).toBeNull()
  })

  it('does not lose cents to float arithmetic', () => {
    expect(toMinor('0.29', 'USD')).toBe(29)
    expect(toMinor('1.15', 'USD')).toBe(115)
  })
})

describe('fromMinor', () => {
  it('gives a plain decimal string for an input field', () => {
    expect(fromMinor(123_456, 'UAH')).toBe('1234.56')
    expect(fromMinor(-5, 'EUR')).toBe('-0.05')
    expect(fromMinor(500, 'JPY')).toBe('500')
  })
})

describe('amountText', () => {
  it('masks a known, an unknown and a zero sum alike when amounts are hidden', () => {
    expect(amountText(123_456, 'UAH', 'uk', true)).toBe('•••• ₴')
    expect(amountText(null, 'EUR', 'uk', true)).toBe('•••• €')
    expect(amountText(0, 'USD', 'uk', true)).toBe('•••• $')
  })

  it('shows «? ₴» for an unknown sum and the formatted sum otherwise', () => {
    expect(amountText(null, 'UAH', 'uk', false)).toBe('? ₴')
    expect(plain(amountText(-80_000, 'EUR', 'uk', false))).toBe(plain(formatMinor(-80_000, 'EUR', 'uk')))
  })
})

describe('currencyName', () => {
  it('takes the name from Intl and capitalises it as a row title', () => {
    expect(currencyName('USD', 'uk')).toBe('Долар США')
    expect(currencyName('PLN', 'uk')).toBe('Польський злотий')
    expect(currencyName('EUR', 'en')).toBe('Euro')
  })
})
