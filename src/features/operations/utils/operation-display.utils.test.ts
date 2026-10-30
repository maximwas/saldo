import { describe, expect, it } from 'vitest'
import type { CategoryOption, OperationItem, OperationRow } from '../operations.types'
import { categoryOptions, displayAmount, refundableMinor } from './operation-display.utils'

const base: OperationRow = {
  id: 'op',
  kind: 'expense',
  direction: 'out',
  accountId: 'a1',
  amountMinor: 299,
  currency: 'USD',
  baseAmountMinor: 12_438,
  baseCurrency: 'UAH',
  categoryId: null,
  counterparty: null,
  note: null,
  occurredAt: '2026-10-22T10:00:00Z',
  occurredOn: '2026-10-22',
  transferId: null,
  refundOfId: null,
  version: 1,
  createdBy: null,
}
const item = (row: Partial<OperationRow>, kind: OperationItem['kind'] = 'expense'): OperationItem => ({
  row: {
    ...base,
    ...row,
  },
  transfer: null,
  kind,
})

describe('displayAmount', () => {
  it('shows a foreign spend in the base currency, as a negative number', () => {
    expect(displayAmount(item({}))).toEqual({
      minor: -12_438,
      currency: 'UAH',
      plus: false,
      tone: 'fact',
    })
  })

  it('keeps the original amount when the rate is unknown, never a 0', () => {
    expect(displayAmount(item({ baseAmountMinor: null }))).toMatchObject({
      minor: -299,
      currency: 'USD',
    })
  })

  it('marks income with a plus and the income tone, a refund with a plus only', () => {
    expect(
      displayAmount(
        item(
          {
            direction: 'in',
            currency: 'UAH',
            amountMinor: 8_250_000,
          },
          'income',
        ),
      ),
    ).toEqual({
      minor: 8_250_000,
      currency: 'UAH',
      plus: true,
      tone: 'income',
    })
    expect(displayAmount(item({ direction: 'in' }, 'refund'))).toMatchObject({
      plus: true,
      tone: 'fact',
    })
  })
})

describe('categoryOptions', () => {
  const categories: CategoryOption[] = [
    {
      id: 'p',
      name: 'Авто',
      kind: 'expense',
      color: 'orange',
      icon: null,
      parentId: null,
      archived: false,
    },
    {
      id: 'c',
      name: 'Пальне',
      kind: 'expense',
      color: null,
      icon: null,
      parentId: 'p',
      archived: false,
    },
    {
      id: 'old',
      name: 'Стара',
      kind: 'expense',
      color: null,
      icon: null,
      parentId: null,
      archived: true,
    },
    {
      id: 'i',
      name: 'Зарплата',
      kind: 'income',
      color: null,
      icon: null,
      parentId: null,
      archived: false,
    },
  ]

  it('lists one kind, hides archived ones and names a child after its parent', () => {
    expect(categoryOptions(categories, 'expense')).toEqual([
      {
        value: 'p',
        label: 'Авто',
      },
      {
        value: 'c',
        label: 'Авто › Пальне',
      },
    ])
  })

  it('keeps an archived category the row already uses', () => {
    expect(categoryOptions(categories, 'expense', 'old').map((option) => option.value)).toContain('old')
  })
})

describe('refundableMinor', () => {
  it('leaves what earlier refunds did not return, never below zero', () => {
    expect(refundableMinor(52_000, 26_000)).toBe(26_000)
    expect(refundableMinor(52_000, 52_000)).toBe(0)
  })
})
