type SummaryRow = {
  direction: 'in' | 'out'
  state: string
  dueOn: string
  plannedMinor: number | null
  remainingMinor: number | null
  currency: string
}

export type CurrencyTotals = {
  /** the base currency's sum, 0 when none */
  base: number
  /** every other currency, shown beside it as «+ 2,99 $»: never converted here */
  others: {
    currency: string
    minor: number
  }[]
}

export type PaymentsSummary = {
  count: number
  /** the latest due date among the open payments, null when none */
  untilOn: string | null
  planned: CurrencyTotals
  overdue: CurrencyTotals & { count: number }
}

function addTo(totals: CurrencyTotals, baseCurrency: string, currency: string, minor: number) {
  if (currency === baseCurrency) {
    totals.base += minor

    return
  }

  const found = totals.others.find((item) => item.currency === currency)

  if (found) {
    found.minor += minor
  } else {
    totals.others.push({
      currency,
      minor,
    })
  }
}

/** an unknown amount (null) is counted by the caller but never summed as 0 */
function totalsOf(rows: readonly SummaryRow[], baseCurrency: string): CurrencyTotals {
  const totals: CurrencyTotals = {
    base: 0,
    others: [],
  }

  for (const row of rows) {
    const minor = row.remainingMinor ?? row.plannedMinor

    if (minor !== null) {
      addTo(totals, baseCurrency, row.currency, minor)
    }
  }

  return totals
}

/** §7: what is still to pay (outgoing only, expected income is never subtracted) and what's past its date without a
 * confirmation */
export function summarizePayments(rows: readonly SummaryRow[], baseCurrency: string): PaymentsSummary {
  const outgoing = rows.filter((row) => row.direction === 'out')
  const overdue = outgoing.filter((row) => row.state === 'unconfirmed')

  return {
    count: outgoing.length,
    untilOn: outgoing.reduce<string | null>(
      (last, row) => (last === null || row.dueOn > last ? row.dueOn : last),
      null,
    ),
    planned: totalsOf(outgoing, baseCurrency),
    overdue: {
      ...totalsOf(overdue, baseCurrency),
      count: overdue.length,
    },
  }
}
