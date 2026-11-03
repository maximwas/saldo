import { describe, expect, it } from 'vitest'
import type { FxRate } from '@/lib/money/fx.utils'
import { boardDigits, rateBoard, splitBoard } from './currencies.utils'

const rate = (patch: Partial<FxRate>): FxRate => ({
  baseCurrency: 'EUR',
  quoteCurrency: 'UAH',
  rate: '41.5',
  rateOn: '2026-10-01',
  source: 'manual',
  ...patch,
})

const nbu = (baseCurrency: string, value: string, rateOn: string) =>
  rate({
    baseCurrency,
    rate: value,
    rateOn,
    source: 'reference',
  })

// the demo's rates (docs/design/demo-data.md): NBU of yesterday and today, today's manual EUR beats NBU's 41.38
const demo = [
  nbu('USD', '41.48', '2026-11-02'),
  nbu('USD', '41.6', '2026-11-03'),
  nbu('EUR', '41.44', '2026-11-02'),
  nbu('EUR', '41.38', '2026-11-03'),
  rate({
    rate: '41.5',
    rateOn: '2026-11-03',
  }),
  nbu('PLN', '9.68', '2026-11-02'),
  nbu('PLN', '9.65', '2026-11-03'),
  nbu('CZK', '1.66', '2026-11-02'),
  nbu('CZK', '1.66', '2026-11-03'),
]

const rowOf = (currency: string, rates: FxRate[] = demo, today = '2026-11-03') =>
  rateBoard(rates, 'UAH', today).find((row) => row.currency === currency)

describe('rateBoard', () => {
  it('lists every currency with a rate and the account ones, except the base', () => {
    expect(rateBoard(demo, 'UAH', '2026-11-03').map((row) => row.currency)).toEqual(['CZK', 'EUR', 'PLN', 'USD'])
    expect(rateBoard([], 'UAH', '2026-11-03', ['GBP']).map((row) => row.currency)).toEqual(['EUR', 'GBP', 'USD'])
  })

  it('the day change is today minus the latest earlier day', () => {
    expect(rowOf('USD')?.change).toBe('0.12')
    expect(rowOf('PLN')?.change).toBe('-0.03')
    expect(rowOf('CZK')?.change).toBe('0')
  })

  it('a manual rate beats NBU on its day, keeps NBU beside it, and is compared with yesterday', () => {
    expect(rowOf('EUR')).toEqual({
      currency: 'EUR',
      rate: '41.5',
      rateOn: '2026-11-03',
      manual: true,
      nbuRate: '41.38',
      change: '0.06',
    })
  })

  it('no earlier rate: no change, not 0; no rate at all: null', () => {
    expect(rowOf('USD', [nbu('USD', '41.6', '2026-11-03')])?.change).toBeNull()
    expect(rowOf('USD', [])).toEqual({
      currency: 'USD',
      rate: null,
      rateOn: null,
      manual: false,
      nbuRate: null,
      change: null,
    })
  })

  it('does not use a rate from the future', () => {
    expect(rowOf('PLN', demo, '2026-11-02')).toMatchObject({
      rate: '9.68',
      change: null,
    })
  })

  it('rule A: an older manual rate does not beat a newer reference one', () => {
    const rates = [
      rate({
        rate: '40',
        rateOn: '2026-10-01',
      }),
      nbu('EUR', '42', '2026-10-20'),
    ]

    expect(rowOf('EUR', rates, '2026-10-30')).toMatchObject({
      rate: '42',
      manual: false,
      change: '2',
    })
  })
})

describe('splitBoard', () => {
  it('puts the pinned ones first in the member order, the others A→Z by name', () => {
    const board = rateBoard(demo, 'UAH', '2026-11-03')
    const names: Record<string, string> = {
      CZK: 'Чеська крона',
      EUR: 'Євро',
      PLN: 'Польський злотий',
      USD: 'Долар США',
    }
    const { shown, others } = splitBoard(board, ['USD', 'EUR'], (currency) => names[currency])

    expect(shown.map((row) => row.currency)).toEqual(['USD', 'EUR'])
    expect(others.map((row) => row.currency)).toEqual(['PLN', 'CZK'])
  })
})

describe('boardDigits', () => {
  it('two digits, four below 1', () => {
    expect(boardDigits('41.5964')).toBe(2)
    expect(boardDigits('0.33556')).toBe(4)
  })
})
