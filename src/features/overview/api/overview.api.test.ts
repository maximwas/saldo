import { describe, expect, it } from 'vitest'
import type { SaldoClient } from '@/types/supabase.types'
import { getOverview } from './overview.api'

type Stub = Promise<unknown> &
  Record<'select' | 'eq' | 'is' | 'in' | 'lte' | 'order' | 'limit' | 'single', () => Stub | Promise<unknown>>

// a table stub: every filter returns the builder, awaiting it gives the rows (the api never touches React)
function stubClient(tables: Record<string, unknown[]>) {
  const builder = (rows: unknown[]) => {
    const rowsResult = Promise.resolve({
      data: rows,
      error: null,
      count: rows.length,
    })
    const query: Stub = Object.assign(rowsResult, {
      select: () => query,
      eq: () => query,
      is: () => query,
      in: () => query,
      lte: () => query,
      order: () => query,
      limit: () => query,
      single: () =>
        Promise.resolve({
          data: rows[0],
          error: null,
        }),
    })

    return query
  }

  return { from: (table: string) => builder(tables[table] ?? []) } as unknown as SaldoClient
}

describe('getOverview', () => {
  const now = new Date('2026-10-30T10:00:00Z')
  const tables = {
    ledgers: [
      {
        base_currency: 'UAH',
        next_income_on: '2026-11-14',
      },
    ],
    accounts: [
      {
        id: 'a1',
        name: 'Card',
        kind: 'bank',
        currency: 'UAH',
        include_in_available: true,
        opening_balance_minor: 0,
      },
      {
        id: 'a2',
        name: 'EUR',
        kind: 'bank',
        currency: 'EUR',
        include_in_available: false,
        opening_balance_minor: 0,
      },
    ],
    account_balances: [
      {
        account_id: 'a1',
        balance_minor: 4_621_580,
      },
      {
        account_id: 'a2',
        balance_minor: 120_000,
      },
    ],
    fx_rates: [
      {
        base_currency: 'EUR',
        quote_currency: 'UAH',
        rate: '41.5',
        rate_on: '2026-10-30',
        source: 'reference',
      },
    ],
    obligation_states: [
      {
        obligation_id: 'o1',
        title: 'Internet',
        source_type: 'manual',
        direction: 'out',
        due_on: '2026-11-10',
        remaining_minor: 35_000,
        currency: 'UAH',
        state: 'plan',
      },
    ],
  }

  it('subtracts obligations to the income date from included balances', async () => {
    const overview = await getOverview(stubClient(tables), {
      ledgerId: 'l1',
      now,
      timeZone: 'Europe/Kyiv',
    })

    expect(overview.available.balancesMinor).toBe(4_621_580)
    expect(overview.available.obligationsMinor).toBe(35_000)
    expect(overview.available.availableMinor).toBe(4_586_580)
    expect(overview.accounts[1].baseMinor).toBe(4_980_000)
  })

  it('keeps the date unset instead of inventing it', async () => {
    const overview = await getOverview(
      stubClient({
        ...tables,
        ledgers: [
          {
            base_currency: 'UAH',
            next_income_on: null,
          },
        ],
      }),
      {
        ledgerId: 'l1',
        now,
        timeZone: 'Europe/Kyiv',
      },
    )

    expect(overview.untilOn).toBeNull()
  })
})
