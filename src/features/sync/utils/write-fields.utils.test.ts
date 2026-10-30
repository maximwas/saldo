import { describe, expect, it } from 'vitest'
import { withVersion, writeFields } from './write-fields.utils'

describe('writeFields', () => {
  it('reads a payment by its operation', () => {
    const fields = writeFields({
      obligationId: 'o1',
      amountMinor: 158_325,
      newOperation: {
        currency: 'UAH',
        occurred_on: '2026-10-30',
        account_id: 'a1',
        note: null,
      },
    })

    expect(fields).toMatchObject({
      amountMinor: 158_325,
      currency: 'UAH',
      date: '2026-10-30',
      accountId: 'a1',
      note: null,
    })
  })
})

describe('withVersion', () => {
  it('moves an edit onto the server version, and says no when the write has none', () => {
    expect(
      withVersion(
        {
          id: 'x',
          expectedVersion: 2,
        },
        5,
      ),
    ).toEqual({
      id: 'x',
      expectedVersion: 5,
    })
    expect(
      withVersion(
        {
          paymentId: 'p',
        },
        5,
      ),
    ).toBeNull()
  })
})
