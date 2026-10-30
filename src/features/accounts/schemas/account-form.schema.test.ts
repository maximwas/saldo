import { describe, expect, it } from 'vitest'
import {
  type AccountFormValues,
  accountFormSchema,
  toCreateAccountInput,
  toUpdateAccountInput,
} from './account-form.schema'
import { createAccountInputSchema } from './account-input.schema'

const values: AccountFormValues = {
  name: '  Основна картка ',
  kind: 'bank',
  currency: 'UAH',
  openingBalanceMinor: 4_621_580,
  openingOn: '2026-10-01',
}

describe('accountFormSchema', () => {
  it('accepts a valid form and trims the name', () => {
    expect(accountFormSchema.parse(values).name).toBe('Основна картка')
  })

  it('refuses an empty name and an empty opening balance, with error keys', () => {
    const result = accountFormSchema.safeParse({
      ...values,
      name: ' ',
      openingBalanceMinor: null,
    })

    expect(result.error?.issues.map((issue) => issue.message).sort()).toEqual(['amountRequired', 'nameRequired'])
  })

  it('takes 0 as a real opening balance', () => {
    expect(
      accountFormSchema.safeParse({
        ...values,
        openingBalanceMinor: 0,
      }).success,
    ).toBe(true)
  })
})

describe('toCreateAccountInput', () => {
  it('builds a row the input schema accepts, with the kind icon and colour', () => {
    const input = toCreateAccountInput(values, {
      id: crypto.randomUUID(),
      ledgerId: crypto.randomUUID(),
      sortOrder: 4,
    })

    expect(createAccountInputSchema.parse(input)).toMatchObject({
      name: 'Основна картка',
      opening_balance_minor: 4_621_580,
      icon: 'credit-card',
      color: 'blue',
      sort_order: 4,
    })
  })
})

describe('toUpdateAccountInput', () => {
  it('carries the version and leaves the currency alone', () => {
    const input = toUpdateAccountInput(values, {
      id: 'x',
      expectedVersion: 3,
    })

    expect(input).toEqual({
      id: 'x',
      expectedVersion: 3,
      patch: {
        name: 'Основна картка',
        kind: 'bank',
      },
    })
  })
})
