import { describe, expect, it } from 'vitest'
import { parseRate, type RateFormValues, rateFormSchema, toSaveRateInput } from './rate-form.schema'
import { saveRateInputSchema } from './rate-input.schema'

describe('parseRate', () => {
  it('reads a comma or a point', () => {
    expect(parseRate('41,5')).toBe(41.5)
    expect(parseRate(' 41.50 ')).toBe(41.5)
  })

  it('refuses text, zero, negatives and more digits than numeric(20,10)', () => {
    expect(parseRate('')).toBeNull()
    expect(parseRate('abc')).toBeNull()
    expect(parseRate('0')).toBeNull()
    expect(parseRate('-1')).toBeNull()
    expect(parseRate('1.12345678901')).toBeNull()
  })
})

describe('rateFormSchema', () => {
  it('gives the error key rateInvalid', () => {
    const result = rateFormSchema.safeParse({
      currency: 'EUR',
      rate: 'x',
      rateOn: '2026-10-30',
    })

    expect(result.error?.issues[0].message).toBe('rateInvalid')
  })
})

describe('toSaveRateInput', () => {
  const values: RateFormValues = {
    currency: 'EUR',
    rate: '41,5',
    rateOn: '2026-10-30',
  }

  it('stores the foreign currency as base and the space currency as quote: 1 EUR = 41.5 UAH', () => {
    const input = toSaveRateInput(values, {
      ledgerId: crypto.randomUUID(),
      baseCurrency: 'UAH',
    })

    expect(saveRateInputSchema.parse(input)).toMatchObject({
      base_currency: 'EUR',
      quote_currency: 'UAH',
      rate: 41.5,
      source: 'manual',
    })
  })

  it('refuses a pair of one currency', () => {
    const input = toSaveRateInput(values, {
      ledgerId: crypto.randomUUID(),
      baseCurrency: 'EUR',
    })

    expect(saveRateInputSchema.safeParse(input).success).toBe(false)
  })
})
