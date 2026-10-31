'use client'

import { useQuery } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { Amount } from '@/components/ui/amount.component'
import { CategoryIcon } from '@/components/ui/category-icon.component'
import { useLedgerStore } from '@/contexts/ledger.context'
import { statisticsQueries } from '../api/statistics.queries'
import { useStatisticsFilters } from '../hooks/statistics-filters.hook'
import { cashflowTotals } from '../utils/statistics.utils'

// Figma «Saldo» → Statistics: desktop 2:73705 = three StatCards (a 32 icon + label-medium, Amount L, caption tertiary),
// mobile 2:78068 = one card: income and expense rows, a border-top «Result» row with Amount M, a caption note.
// Transfers, loans and adjustments are not in them (§20), and the caption says so.
export function SummaryCards() {
  const translate = useTranslations('statistics')
  const currency = useLedgerStore((ledger) => ledger.baseCurrency)
  const { params } = useStatisticsFilters()
  const { data } = useQuery(statisticsQueries.cashflow(params))
  const categories = useQuery(statisticsQueries.byCategory(params))

  if (!data) {
    return null
  }

  const totals = cashflowTotals(data)
  const result = totals.resultMinor < 0 ? 'shortfall' : 'income'
  const expenseCategories = (categories.data ?? []).filter((row) => row.category_kind === 'expense').length
  const tiles = [
    {
      key: 'income',
      icon: 'briefcase',
      color: 'lime',
      minor: totals.incomeMinor,
      kind: 'income',
      caption: null,
    },
    {
      key: 'expense',
      icon: 'shopping-cart',
      color: 'blue',
      minor: totals.expenseMinor,
      kind: 'fact',
      caption: translate('summary.expenseCaption', {
        operations: totals.operationsCount,
        categories: expenseCategories,
      }),
    },
    {
      key: 'result',
      icon: 'scale',
      color: 'green',
      minor: totals.resultMinor,
      kind: result,
      caption: translate('summary.excluded'),
    },
  ] as const
  const unknown = totals.unknownCount > 0 && (
    <p className="text-caption text-warning-text">{translate('summary.unknown', { count: totals.unknownCount })}</p>
  )

  return (
    <div className="flex flex-col gap-2">
      <dl className="hidden gap-6 lg:grid lg:grid-cols-3">
        {tiles.map((tile) => (
          <div key={tile.key} className="flex flex-col gap-3 rounded-card bg-card p-6 shadow-card">
            <dt className="flex items-center gap-3 text-label font-medium text-text-secondary">
              <CategoryIcon icon={tile.icon} color={tile.color} size="sm" />
              {translate(`summary.${tile.key}`)}
            </dt>
            <dd className="flex flex-col gap-3">
              <Amount minor={tile.minor} currency={currency} kind={tile.kind} size="l" />
              {tile.caption && <span className="text-caption text-text-tertiary">{tile.caption}</span>}
            </dd>
          </div>
        ))}
      </dl>
      <dl className="flex flex-col gap-3 rounded-card bg-card p-5 shadow-card lg:hidden">
        <div className="flex items-baseline justify-between">
          <dt className="text-label text-text-secondary">{translate('summary.income')}</dt>
          <dd>
            <Amount minor={totals.incomeMinor} currency={currency} kind="income" />
          </dd>
        </div>
        <div className="flex items-baseline justify-between">
          <dt className="text-label text-text-secondary">{translate('summary.expense')}</dt>
          <dd>
            <Amount minor={totals.expenseMinor} currency={currency} />
          </dd>
        </div>
        <div className="flex items-baseline justify-between border-border border-t pt-3">
          <dt className="text-body font-medium text-text-primary">{translate('summary.result')}</dt>
          <dd>
            <Amount minor={totals.resultMinor} currency={currency} kind={result} size="m" />
          </dd>
        </div>
        <p className="text-caption text-text-secondary">{translate('summary.excluded')}</p>
      </dl>
      {unknown}
    </div>
  )
}
