import { describe, expect, it } from 'vitest'
import { parseAmountText } from './money-input.utils'

describe('parseAmountText', () => {
  it('turns a numeric string into minor units without floats', () => {
    expect(parseAmountText('1583.25', 'UAH')).toBe(158_325)
    expect(parseAmountText('0.1', 'USD')).toBe(10)
  })

  it('accepts half-typed input', () => {
    expect(parseAmountText('12.', 'UAH')).toBe(1200)
    expect(parseAmountText('.5', 'UAH')).toBe(50)
  })

  it('returns null for empty or too precise text', () => {
    expect(parseAmountText('', 'UAH')).toBeNull()
    expect(parseAmountText('1.234', 'UAH')).toBeNull()
  })
})
