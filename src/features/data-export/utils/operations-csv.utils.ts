import Papa from 'papaparse'
import { fromMinor } from '@/lib/money/money.utils'

export type CsvOperation = {
  occurredOn: string
  kind: string
  direction: 'in' | 'out'
  amountMinor: number
  currency: string
  /** null = the rate is unknown: the cell stays empty, never 0 */
  baseAmountMinor: number | null
  baseCurrency: string
  account: string | null
  category: string | null
  counterparty: string | null
  note: string | null
}

const FIELDS = [
  'date',
  'kind',
  'amount',
  'currency',
  'base_amount',
  'base_currency',
  'account',
  'category',
  'counterparty',
  'note',
]

// a cell that starts with = + @ (or a minus that is not a number) gets a ' in front, so a spreadsheet never runs it
const FORMULA = /^([=+@\t\r]|-(?!\d))/

const BOM = '\uFEFF'

const signed = (minor: number, currency: string, direction: CsvOperation['direction']) =>
  `${direction === 'out' ? '-' : ''}${fromMinor(minor, currency)}`

/** operations as CSV: money out is negative; the BOM makes Excel read the Cyrillic as UTF-8 */
export function toOperationsCsv(rows: CsvOperation[]): string {
  const data = rows.map((row) => [
    row.occurredOn,
    row.kind,
    signed(row.amountMinor, row.currency, row.direction),
    row.currency,
    row.baseAmountMinor === null ? '' : signed(row.baseAmountMinor, row.baseCurrency, row.direction),
    row.baseCurrency,
    row.account ?? '',
    row.category ?? '',
    row.counterparty ?? '',
    row.note ?? '',
  ])

  return (
    BOM +
    Papa.unparse(
      {
        fields: FIELDS,
        data,
      },
      { escapeFormulae: FORMULA },
    )
  )
}
