import { describe, expect, it } from 'vitest'
import type { OperationRow, TransferInfo } from '../operations.types'
import { buildItems, dayLabelKind, groupByDay, summarize } from './operation-items.utils'

const row = (overrides: Partial<OperationRow>): OperationRow => ({
  id: 'op',
  kind: 'expense',
  direction: 'out',
  accountId: 'a1',
  amountMinor: 1000,
  currency: 'UAH',
  baseAmountMinor: 1000,
  baseCurrency: 'UAH',
  categoryId: null,
  counterparty: null,
  note: null,
  occurredAt: '2026-10-30T10:00:00Z',
  occurredOn: '2026-10-30',
  transferId: null,
  refundOfId: null,
  version: 1,
  createdBy: null,
  ...overrides,
})

const transfer: TransferInfo = {
  id: 't1',
  fromAccountId: 'a1',
  toAccountId: 'a2',
  fromAmountMinor: 80000,
  fromCurrency: 'EUR',
  toAmountMinor: 3320000,
  toCurrency: 'UAH',
  feeMinor: 500,
}

describe('buildItems', () => {
  it('shows a transfer once and keeps its fee as a separate expense', () => {
    const rows = [
      row({
        id: 'out',
        kind: 'transfer_out',
        direction: 'out',
        transferId: 't1',
        currency: 'EUR',
      }),
      row({
        id: 'in',
        kind: 'transfer_in',
        direction: 'in',
        transferId: 't1',
        accountId: 'a2',
      }),
      row({
        id: 'fee',
        kind: 'expense',
        transferId: 't1',
        amountMinor: 500,
      }),
    ]
    const items = buildItems(rows, { t1: transfer })

    expect(items.map((item) => [item.row.id, item.kind])).toEqual([
      ['out', 'transfer'],
      ['fee', 'expense'],
    ])
    expect(items[0].transfer).toEqual(transfer)
  })

  it('keeps the only leg a filter let through', () => {
    const items = buildItems(
      [
        row({
          id: 'in',
          kind: 'transfer_in',
          direction: 'in',
          transferId: 't1',
        }),
      ],
      {
        t1: transfer,
      },
    )

    expect(items).toHaveLength(1)
    expect(items[0].kind).toBe('transfer')
  })
})

describe('groupByDay', () => {
  it('groups neighbours of the same day in order', () => {
    const items = buildItems(
      [
        row({
          id: '1',
          occurredOn: '2026-10-30',
        }),
        row({
          id: '2',
          occurredOn: '2026-10-30',
        }),
        row({
          id: '3',
          occurredOn: '2026-10-29',
        }),
      ],
      {},
    )

    expect(groupByDay(items).map((group) => [group.date, group.items.map((item) => item.row.id)])).toEqual([
      ['2026-10-30', ['1', '2']],
      ['2026-10-29', ['3']],
    ])
  })
})

describe('summarize', () => {
  it('counts a transfer and a debt as neither income nor spending, and a refund lowers spending', () => {
    const items = buildItems(
      [
        row({
          id: 'salary',
          kind: 'income',
          direction: 'in',
          baseAmountMinor: 8_250_000,
        }),
        row({
          id: 'shop',
          kind: 'expense',
          baseAmountMinor: 110_825,
        }),
        row({
          id: 'back',
          kind: 'refund',
          direction: 'in',
          baseAmountMinor: 10_825,
        }),
        row({
          id: 'out',
          kind: 'transfer_out',
          transferId: 't1',
          baseAmountMinor: 3_320_000,
        }),
        row({
          id: 'debt',
          kind: 'debt_out',
          baseAmountMinor: 200_000,
        }),
        row({
          id: 'fix',
          kind: 'adjustment',
          direction: 'in',
          baseAmountMinor: 5000,
          note: 'x',
        }),
      ],
      { t1: transfer },
    )

    expect(summarize(items)).toEqual({
      incomeMinor: 8_250_000,
      expenseMinor: 100_000,
      resultMinor: 8_150_000,
      unknownCount: 0,
    })
  })

  it('leaves an operation without a rate out of the sums and counts it, never as 0', () => {
    const items = buildItems(
      [
        row({
          id: 'usd',
          currency: 'USD',
          baseAmountMinor: null,
        }),
        row({
          id: 'uah',
          baseAmountMinor: 500,
        }),
      ],
      {},
    )

    expect(summarize(items)).toMatchObject({
      expenseMinor: 500,
      unknownCount: 1,
    })
  })
})

describe('dayLabelKind', () => {
  it('names today and yesterday across a month edge', () => {
    expect(dayLabelKind('2026-11-01', '2026-11-01')).toBe('today')
    expect(dayLabelKind('2026-10-31', '2026-11-01')).toBe('yesterday')
    expect(dayLabelKind('2026-10-30', '2026-11-01')).toBe('date')
  })
})
