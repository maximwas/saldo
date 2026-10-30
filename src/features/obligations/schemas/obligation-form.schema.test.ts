import { describe, expect, it } from 'vitest'
import { obligationFormSchema, toCreateObligationInput } from './obligation-form.schema'
import { createObligationInputSchema } from './obligation-input.schema'

const values = {
  title: ' Інтернет ',
  direction: 'out' as const,
  amount: '350,00',
  currency: 'UAH' as const,
  dueOn: '2026-11-10',
  accountId: null,
  categoryId: null,
}
const context = {
  id: crypto.randomUUID(),
  ledgerId: crypto.randomUUID(),
}

describe('obligation form', () => {
  it('maps to minor units and a valid input', () => {
    const input = toCreateObligationInput(obligationFormSchema.parse(values), context)

    expect(input.planned_amount_minor).toBe(35_000)
    expect(input.title).toBe('Інтернет')
    expect(input.occurrence_on).toBe('2026-11-10')
    expect(createObligationInputSchema.safeParse(input).success).toBe(true)
  })

  it('an empty amount is unknown (null), zero is rejected', () => {
    expect(
      toCreateObligationInput(
        obligationFormSchema.parse({
          ...values,
          amount: '',
        }),
        context,
      ).planned_amount_minor,
    ).toBeNull()
    expect(
      obligationFormSchema.safeParse({
        ...values,
        amount: '0',
      }).success,
    ).toBe(false)
  })
})
