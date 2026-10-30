import { describe, expect, it } from 'vitest'
import {
  chunks,
  indexTransfers,
  kindsOfType,
  type OperationDbRow,
  toOperationRow,
  transferIdsOf,
} from './operation-rows.utils'

const dbRow: OperationDbRow = {
  id: 'o1',
  kind: 'expense',
  direction: 'out',
  account_id: 'a1',
  amount_minor: 500,
  currency: 'EUR',
  base_amount_minor: null,
  base_currency: 'UAH',
  category_id: null,
  counterparty: null,
  note: 'lunch',
  occurred_at: '2026-10-30T10:00:00Z',
  occurred_on: '2026-10-30',
  transfer_id: null,
  version: 2,
  created_by: 'u1',
}

describe('toOperationRow', () => {
  it('maps columns and keeps an unknown base amount null', () => {
    expect(toOperationRow(dbRow)).toMatchObject({
      accountId: 'a1',
      amountMinor: 500,
      baseAmountMinor: null,
      note: 'lunch',
    })
  })

  it('narrows direction to in or out', () => {
    expect(
      toOperationRow({
        ...dbRow,
        direction: 'in',
      }).direction,
    ).toBe('in')
    expect(
      toOperationRow({
        ...dbRow,
        direction: 'weird',
      }).direction,
    ).toBe('out')
  })
})

describe('transfers', () => {
  it('lists each transfer id once and skips plain operations', () => {
    const ids = transferIdsOf([{ transferId: 't1' }, { transferId: null }, { transferId: 't1' }, { transferId: 't2' }])

    expect(ids).toEqual(['t1', 't2'])
  })

  it('indexes transfers by id', () => {
    const result = indexTransfers([
      {
        id: 't1',
        from_account_id: 'a1',
        to_account_id: 'a2',
        from_amount_minor: 100,
        from_currency: 'UAH',
        to_amount_minor: 2,
        to_currency: 'EUR',
        fee_minor: null,
      },
    ])

    expect(result.t1).toMatchObject({
      fromAccountId: 'a1',
      toAmountMinor: 2,
      feeMinor: null,
    })
  })
})

describe('kindsOfType', () => {
  it('has no filter for «all»', () => {
    expect(kindsOfType('all')).toBeNull()
  })

  it('counts a refund with expenses and both legs with transfers', () => {
    expect(kindsOfType('expense')).toEqual(['expense', 'refund'])
    expect(kindsOfType('transfer')).toEqual(['transfer_out', 'transfer_in'])
  })
})

describe('chunks', () => {
  it('splits into slices of the size, the last one shorter', () => {
    expect(chunks([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]])
  })

  it('gives no slices for no items', () => {
    expect(chunks([], 50)).toEqual([])
  })
})
