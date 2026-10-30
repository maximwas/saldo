import { describe, expect, it } from 'vitest'
import { createOperationInputSchema } from './create-operation-input.schema'
import {
  type OperationFormValues,
  operationFormSchema,
  toCreateOperationInput,
  toUpdateOperationInput,
} from './operation-form.schema'
import { updateOperationInputSchema } from './update-operation-input.schema'

const ACCOUNT = '0b6f7a52-1d2e-4c3b-9a8f-1e2d3c4b5a69'
const LEDGER = '7c1d2e3f-4a5b-4c6d-8e9f-0a1b2c3d4e5f'
const OPERATION = '3e4f5a6b-7c8d-4e9f-8a0b-1c2d3e4f5a6b'
const SOURCE = '5a6b7c8d-9e0f-4a1b-8c2d-3e4f5a6b7c8d'

// Friday 30.10.2026, 14:00 in Kyiv
const clock = {
  timeZone: 'Europe/Kyiv',
  now: () => new Date('2026-10-30T12:00:00Z'),
}

const expense: OperationFormValues = {
  kind: 'expense',
  direction: 'in',
  amount: '1 234,56',
  currency: 'UAH',
  accountId: ACCOUNT,
  categoryId: null,
  occurredOn: '2026-10-30',
  counterparty: ' Сільпо ',
  note: '',
}

describe('operationFormSchema', () => {
  it('accepts a typed amount with a comma', () => {
    expect(operationFormSchema.safeParse(expense).success).toBe(true)
  })

  it('rejects zero, text and a third decimal on the amount field', () => {
    for (const amount of ['0', 'abc', '1,234']) {
      const result = operationFormSchema.safeParse({
        ...expense,
        amount,
      })

      expect(result.error?.issues[0]?.path).toEqual(['amount'])
    }
  })

  it('requires a note on an adjustment (§5)', () => {
    const result = operationFormSchema.safeParse({
      ...expense,
      kind: 'adjustment',
      note: '  ',
    })

    expect(result.error?.issues[0]).toMatchObject({
      path: ['note'],
      message: 'adjustmentNote',
    })
  })
})

describe('toCreateOperationInput', () => {
  it('maps the form to the create_operation input in minor units', () => {
    const input = toCreateOperationInput(expense, clock, {
      id: OPERATION,
      ledgerId: LEDGER,
    })

    expect(input).toEqual({
      id: OPERATION,
      ledger_id: LEDGER,
      kind: 'expense',
      direction: 'out',
      account_id: ACCOUNT,
      amount_minor: 123_456,
      currency: 'UAH',
      occurred_at: '2026-10-30T12:00:00.000Z',
      occurred_on: '2026-10-30',
      category_id: null,
      counterparty: 'Сільпо',
      note: null,
      refund_of_id: null,
      duplicated_from_id: null,
    })
    expect(createOperationInputSchema.parse(input)).toEqual(input)
  })

  it('keeps the link to the operation a duplicate copies (plan 1.8)', () => {
    const input = toCreateOperationInput(expense, clock, {
      id: OPERATION,
      ledgerId: LEDGER,
      duplicatedFromId: SOURCE,
    })

    expect(createOperationInputSchema.parse(input).duplicated_from_id).toBe(SOURCE)
  })

  it('puts a past date at local noon, so the day never shifts', () => {
    const input = toCreateOperationInput(
      {
        ...expense,
        occurredOn: '2026-10-25',
      },
      clock,
      {
        id: OPERATION,
        ledgerId: LEDGER,
      },
    )

    // 25.10.2026 is the DST switch day in Kyiv; noon there is already +02:00
    expect(input.occurred_at).toBe('2026-10-25T10:00:00.000Z')
  })

  it('keeps the chosen direction only for an adjustment', () => {
    const input = toCreateOperationInput(
      {
        ...expense,
        kind: 'adjustment',
        direction: 'in',
        note: 'звірка з банком',
      },
      clock,
      {
        id: OPERATION,
        ledgerId: LEDGER,
      },
    )

    expect(input.direction).toBe('in')
  })
})

describe('toUpdateOperationInput', () => {
  it('sends the expected version with the patch', () => {
    const input = toUpdateOperationInput(expense, clock, {
      id: OPERATION,
      expectedVersion: 3,
    })

    expect(updateOperationInputSchema.parse(input)).toMatchObject({
      id: OPERATION,
      expectedVersion: 3,
      patch: {
        amount_minor: 123_456,
        direction: 'out',
      },
    })
  })
})

describe('createOperationInputSchema', () => {
  it('rejects a direction that does not match the kind', () => {
    const input = toCreateOperationInput(expense, clock, {
      id: OPERATION,
      ledgerId: LEDGER,
    })

    expect(
      createOperationInputSchema.safeParse({
        ...input,
        direction: 'in',
      }).success,
    ).toBe(false)
  })
})
