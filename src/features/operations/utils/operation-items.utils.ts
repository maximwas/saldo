import { addDays, format, parse } from 'date-fns'
import type { OperationItem, OperationItemKind, OperationRow, TransferInfo } from '../operations.types'

export type DayGroup = {
  date: string
  items: OperationItem[]
}

export type Totals = {
  incomeMinor: number
  expenseMinor: number
  /** income − expenses; refunds reduce expenses and are not income */
  resultMinor: number
  /** operations in a foreign currency without a rate: they are not in the sums above */
  unknownCount: number
}

const itemKindOf = (row: OperationRow): OperationItemKind => {
  if (row.kind === 'transfer_out' || row.kind === 'transfer_in') {
    return 'transfer'
  }

  if (row.kind === 'debt_out' || row.kind === 'debt_in') {
    return 'debt'
  }

  return row.kind as OperationItemKind
}

/** both legs of a transfer become one item; the transfer fee (an expense with a transfer_id) stays its own line */
export function buildItems(rows: OperationRow[], transfers: Record<string, TransferInfo>): OperationItem[] {
  const seenTransfers = new Set<string>()
  const items: OperationItem[] = []

  for (const row of rows) {
    const kind = itemKindOf(row)

    if (kind !== 'transfer' || !row.transferId) {
      items.push({
        row,
        transfer: null,
        kind,
      })

      continue
    }

    if (seenTransfers.has(row.transferId)) {
      continue
    }

    seenTransfers.add(row.transferId)
    items.push({
      row,
      transfer: transfers[row.transferId] ?? null,
      kind,
    })
  }

  return items
}

/** rows come newest first, so the groups do too; the order inside a day is kept */
export function groupByDay(items: OperationItem[]): DayGroup[] {
  const groups: DayGroup[] = []

  for (const item of items) {
    const last = groups.at(-1)

    if (last?.date === item.row.occurredOn) {
      last.items.push(item)
    } else {
      groups.push({
        date: item.row.occurredOn,
        items: [item],
      })
    }
  }

  return groups
}

/** sums in the base currency; transfers, debts and adjustments are not income or spending (§5, §20) */
export function summarize(items: OperationItem[]): Totals {
  let incomeMinor = 0
  let expenseMinor = 0
  let unknownCount = 0

  for (const { row, kind } of items) {
    if (kind !== 'income' && kind !== 'expense' && kind !== 'refund') {
      continue
    }

    if (row.baseAmountMinor === null) {
      unknownCount += 1

      continue
    }

    if (kind === 'income') {
      incomeMinor += row.baseAmountMinor
    } else if (kind === 'expense') {
      expenseMinor += row.baseAmountMinor
    } else {
      expenseMinor -= row.baseAmountMinor
    }
  }

  return {
    incomeMinor,
    expenseMinor,
    resultMinor: incomeMinor - expenseMinor,
    unknownCount,
  }
}

/** how a day header names its date: today, yesterday or by the date alone */
export function dayLabelKind(date: string, today: string): 'today' | 'yesterday' | 'date' {
  if (date === today) {
    return 'today'
  }

  const yesterday = format(addDays(parse(today, 'yyyy-MM-dd', new Date()), -1), 'yyyy-MM-dd')

  return date === yesterday ? 'yesterday' : 'date'
}
