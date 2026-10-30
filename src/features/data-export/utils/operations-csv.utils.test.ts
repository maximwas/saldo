import { describe, expect, it } from 'vitest'
import { type CsvOperation, toOperationsCsv } from './operations-csv.utils'

const expense: CsvOperation = {
  occurredOn: '2026-10-15',
  kind: 'expense',
  direction: 'out',
  amountMinor: 12550,
  currency: 'UAH',
  baseAmountMinor: 12550,
  baseCurrency: 'UAH',
  account: 'Картка',
  category: 'Кафе',
  counterparty: null,
  note: 'Кава, "лате"',
}

const lines = (csv: string) => csv.slice(1).split('\r\n')

describe('toOperationsCsv', () => {
  it('starts with a BOM and a header, money out is negative', () => {
    const csv = toOperationsCsv([expense])

    expect(csv.charCodeAt(0)).toBe(0xfeff)
    expect(lines(csv)).toEqual([
      'date,kind,amount,currency,base_amount,base_currency,account,category,counterparty,note',
      '2026-10-15,expense,-125.50,UAH,-125.50,UAH,Картка,Кафе,,"Кава, ""лате"""',
    ])
  })

  it('leaves an unknown base amount empty, never 0', () => {
    const csv = toOperationsCsv([
      {
        ...expense,
        direction: 'in',
        kind: 'income',
        currency: 'USD',
        baseAmountMinor: null,
        note: null,
      },
    ])

    expect(lines(csv)[1]).toBe('2026-10-15,income,125.50,USD,,UAH,Картка,Кафе,,')
  })

  it('defuses spreadsheet formulas but keeps negative numbers', () => {
    const csv = toOperationsCsv([
      {
        ...expense,
        counterparty: '=HYPERLINK("x")',
        note: '-cmd',
      },
    ])

    expect(lines(csv)[1]).toBe(`2026-10-15,expense,-125.50,UAH,-125.50,UAH,Картка,Кафе,"'=HYPERLINK(""x"")","'-cmd"`)
  })
})
