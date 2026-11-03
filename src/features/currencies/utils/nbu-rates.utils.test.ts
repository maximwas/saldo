import { describe, expect, it } from 'vitest'
import { parseNbuRates, toReferenceRows } from './nbu-rates.utils'

// invented rates in the NBU answer format
const answer = [
  {
    r030: 840,
    txt: 'Долар США',
    rate: 40.5,
    cc: 'USD',
    exchangedate: '07.03.2031',
    special: 'N',
  },
  {
    r030: 978,
    txt: 'Євро',
    rate: 44.25,
    cc: 'EUR',
    exchangedate: '07.03.2031',
    special: null,
  },
  {
    r030: 985,
    txt: 'Злотий',
    rate: 10.1,
    cc: 'PLN',
    exchangedate: '07.03.2031',
    special: null,
  },
]

describe('parseNbuRates', () => {
  it('reads the allowed currencies as rates to UAH on the NBU date', () => {
    expect(parseNbuRates(answer)).toEqual([
      {
        baseCurrency: 'USD',
        quoteCurrency: 'UAH',
        rate: '40.5',
        rateOn: '2031-03-07',
        source: 'reference',
      },
      {
        baseCurrency: 'EUR',
        quoteCurrency: 'UAH',
        rate: '44.25',
        rateOn: '2031-03-07',
        source: 'reference',
      },
    ])
  })

  it('gives nothing for an empty answer (a date NBU has not set yet)', () => {
    expect(parseNbuRates([])).toEqual([])
  })

  it('throws on a broken row of an allowed currency instead of writing it', () => {
    expect(() =>
      parseNbuRates([
        {
          cc: 'USD',
          rate: 0,
          exchangedate: '07.03.2031',
        },
      ]),
    ).toThrow()
    expect(() =>
      parseNbuRates([
        {
          cc: 'EUR',
          rate: 44.25,
          exchangedate: '2031-03-07',
        },
      ]),
    ).toThrow()
    expect(() => parseNbuRates({ error: 'down' })).toThrow()
  })
})

describe('toReferenceRows', () => {
  const nbuRates = parseNbuRates(answer)

  it('stores NBU rates as they are for a UAH space', () => {
    expect(
      toReferenceRows(nbuRates, [
        {
          id: 'space-uah',
          base_currency: 'UAH',
        },
      ]),
    ).toEqual([
      {
        ledger_id: 'space-uah',
        base_currency: 'USD',
        quote_currency: 'UAH',
        rate: 40.5,
        rate_on: '2031-03-07',
        source: 'reference',
        source_name: 'nbu',
      },
      {
        ledger_id: 'space-uah',
        base_currency: 'EUR',
        quote_currency: 'UAH',
        rate: 44.25,
        rate_on: '2031-03-07',
        source: 'reference',
        source_name: 'nbu',
      },
    ])
  })

  it('crosses through UAH for a EUR space, rounded to 10 decimals', () => {
    const rows = toReferenceRows(nbuRates, [
      {
        id: 'space-eur',
        base_currency: 'EUR',
      },
    ])

    // 1 / 44.25 and 40.5 / 44.25
    expect(rows.map(({ base_currency, quote_currency, rate }) => [base_currency, quote_currency, rate])).toEqual([
      ['UAH', 'EUR', 0.0225988701],
      ['USD', 'EUR', 0.9152542373],
    ])
  })

  it('writes nothing when NBU gave no rates', () => {
    expect(
      toReferenceRows(
        [],
        [
          {
            id: 'space-uah',
            base_currency: 'UAH',
          },
        ],
      ),
    ).toEqual([])
  })
})
