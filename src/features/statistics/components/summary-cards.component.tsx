'use client'

import { useQuery } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { Amount } from '@/components/ui/amount.component'
import { useLedgerStore } from '@/contexts/ledger.context'
import { statisticsQueries } from '../api/statistics.queries'
import { useStatisticsFilters } from '../hooks/statistics-filters.hook'
import { cashflowTotals } from '../utils/statistics.utils'

// Figma «Saldo» → Statistics 2:73594: three cards, income / expenses / result, the figure in Amount L, a caption under it.
// Transfers, loans and adjustments are not in them (§20), and the caption says so.
export function SummaryCards() {
  const translate = useTranslations('statistics')
  const currency = useLedgerStore((ledger) => ledger.baseCurrency)
  const { params } = useStatisticsFilters()
  const { data } = useQuery(statisticsQueries.cashflow(params))

  if (!data) {
    return (
      <div aria-busy className="grid gap-4 lg:grid-cols-3 lg:gap-6">
        {[0, 1, 2].map((index) => (
          <div key={index} className="h-32 animate-pulse rounded-card bg-subtle" />
        ))}
      </div>
    )
  }

  const totals = cashflowTotals(data)
  const tiles = [
    {
      key: 'income',
      minor: totals.incomeMinor,
      kind: 'income',
    },
    {
      key: 'expense',
      minor: totals.expenseMinor,
      kind: 'fact',
    },
    {
      key: 'result',
      minor: totals.resultMinor,
      kind: totals.resultMinor < 0 ? 'shortfall' : 'income',
    },
  ] as const

  return (
    <div className="flex flex-col gap-2">
      <dl className="grid gap-4 lg:grid-cols-3 lg:gap-6">
        {tiles.map((tile) => (
          <div key={tile.key} className="flex flex-col gap-2 rounded-card bg-card p-5 shadow-card lg:p-6">
            <dt className="text-label text-text-secondary">{translate(`summary.${tile.key}`)}</dt>
            <dd>
              <Amount minor={tile.minor} currency={currency} kind={tile.kind} size="l" />
            </dd>
          </div>
        ))}
      </dl>
      <p className="text-caption text-text-secondary">
        {translate('summary.note', { count: totals.operationsCount })}
        {totals.unknownCount > 0 && ` ${translate('summary.unknown', { count: totals.unknownCount })}`}
      </p>
    </div>
  )
}
