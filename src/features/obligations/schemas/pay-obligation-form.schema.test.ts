import { describe, expect, it } from 'vitest'
import {
  type PayObligationFormValues,
  payObligationFormSchema,
  toPayObligationInput,
} from './pay-obligation-form.schema'
import { payObligationInputSchema } from './pay-obligation-input.schema'

const ACCOUNT = '0b6f7a52-1d2e-4c3b-9a8f-1e2d3c4b5a69'
const EXISTING = '2d8b9c74-3f4a-4e5d-9cab-3a4f5e6d7c8b'

const clock = {
  timeZone: 'Europe/Kyiv',
  now: () => new Date('2026-10-30T12:00:00Z'),
}

const context = {
  paymentId: '4f5a6b7c-8d9e-4f0a-9b1c-2d3e4f5a6b7c',
  operationId: '5a6b7c8d-9e0f-4a1b-8c2d-3e4f5a6b7c8d',
  ledgerId: '7c1d2e3f-4a5b-4c6d-8e9f-0a1b2c3d4e5f',
  obligation: {
    id: '6b7c8d9e-0f1a-4b2c-9d3e-4f5a6b7c8d9e',
    version: 2,
    direction: 'out' as const,
    categoryId: null,
  },
}

const paid: PayObligationFormValues = {
  amount: '1500',
  currency: 'UAH',
  accountId: ACCOUNT,
  existingOperationId: null,
  occurredOn: '2026-10-30',
  settle: false,
  note: '',
}

describe('payObligationFormSchema', () => {
  it('needs an account unless an existing operation is linked', () => {
    const result = payObligationFormSchema.safeParse({
      ...paid,
      accountId: null,
    })

    expect(result.error?.issues[0]).toMatchObject({
      path: ['accountId'],
      message: 'accountRequired',
    })
  })
})

describe('toPayObligationInput', () => {
  it('creates one expense with the expected version of the obligation', () => {
    const input = payObligationInputSchema.parse(toPayObligationInput(paid, clock, context))

    expect(input).toMatchObject({
      expectedVersion: 2,
      amountMinor: 150_000,
      existingOperationId: null,
      newOperation: {
        id: context.operationId,
        kind: 'expense',
        amount_minor: 150_000,
      },
    })
  })

  it('receives an expected income as an income operation', () => {
    const input = payObligationInputSchema.parse(
      toPayObligationInput(paid, clock, {
        ...context,
        obligation: {
          ...context.obligation,
          direction: 'in',
        },
      }),
    )

    expect(input.newOperation).toMatchObject({
      kind: 'income',
      direction: 'in',
    })
  })

  it('links an existing operation without a new one', () => {
    const input = payObligationInputSchema.parse(
      toPayObligationInput(
        {
          ...paid,
          existingOperationId: EXISTING,
        },
        clock,
        context,
      ),
    )

    expect(input.newOperation).toBeNull()
    expect(input.existingOperationId).toBe(EXISTING)
  })
})
