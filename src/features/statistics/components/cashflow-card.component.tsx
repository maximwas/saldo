'use client'

import { useQuery } from '@tanstack/react-query'
import type { Route } from 'next'
import Link from 'next/link'
import { useFormatter, useTranslations } from 'next-intl'
import { Amount } from '@/components/ui/amount.component'
import { useLedgerStore } from '@/contexts/ledger.context'
import type { CashflowRow } from '../api/statistics.api'
import { statisticsQueries } from '../api/statistics.queries'
import { useStatisticsFilters } from '../hooks/statistics-filters.hook'
import { cardStatus, cashflowTotals, netExpense } from '../utils/statistics.utils'
import { bucketPeriod, operationsHref } from '../utils/statistics-period.utils'
import { BarsChart } from './bars-chart.component'
import { QueryCard } from './query-card.component'
import { StatTable } from './stat-table.component'

const LINK = 'rounded-xs text-primary-text outline-none focus-visible:ring-2 focus-visible:ring-primary'

// the x label of a bucket: a day, the first day of a week, a month or a year
function useBucketLabel() {
  const format = useFormatter()
  const { params } = useStatisticsFilters()
  const options = {
    day: {
      day: '2-digit',
      month: '2-digit',
    },
    week: {
      day: '2-digit',
      month: '2-digit',
    },
    month: { month: 'short' },
    year: { year: 'numeric' },
  } as const

  return (periodStart: string) =>
    format.dateTime(new Date(`${periodStart}T12:00:00Z`), {
      ...options[params.bucket],
      timeZone: 'UTC',
    })
}

function CashflowChart({ rows }: { rows: CashflowRow[] }) {
  const translate = useTranslations('statistics')
  const currency = useLedgerStore((ledger) => ledger.baseCurrency)
  const label = useBucketLabel()

  return (
    <BarsChart
      currency={currency}
      summary={translate('cashflow.summary', { count: rows.length })}
      series={[
        {
          key: 'income',
          name: translate('summary.income'),
          fill: 'var(--color-positive)',
        },
        {
          key: 'expense',
          name: translate('summary.expense'),
          fill: 'var(--color-primary)',
        },
      ]}
      // a bucket without operations has no bars: «no data» is not a zero
      data={rows.map((row) => ({
        label: label(row.period_start),
        income: row.operations_count > 0 ? row.income_minor : null,
        expense: row.operations_count > 0 ? netExpense(row) : null,
      }))}
    />
  )
}

function CashflowTable({ rows }: { rows: CashflowRow[] }) {
  const translate = useTranslations('statistics')
  const currency = useLedgerStore((ledger) => ledger.baseCurrency)
  const { params, who } = useStatisticsFilters()
  const label = useBucketLabel()
  const totals = cashflowTotals(rows)
  const amounts = (row: CashflowRow) =>
    row.operations_count === 0
      ? [
          <span key="none" className="text-text-tertiary">
            {translate('noData')}
          </span>,
          null,
          null,
        ]
      : [
          <Amount key="in" minor={row.income_minor} currency={currency} kind="income" />,
          <Amount key="out" minor={netExpense(row)} currency={currency} />,
          <Amount key="res" minor={row.income_minor - netExpense(row)} currency={currency} />,
        ]

  return (
    <StatTable
      caption={translate('cashflow.title')}
      headers={[
        { label: translate('cashflow.period') },
        {
          label: translate('summary.income'),
          end: true,
        },
        {
          label: translate('summary.expense'),
          end: true,
        },
        {
          label: translate('summary.result'),
          end: true,
        },
      ]}
      rows={rows.map((row) => ({
        key: row.period_start,
        cells: [
          <Link
            key="label"
            className={LINK}
            href={
              operationsHref({
                period: bucketPeriod(params.bucket, row.period_start),
                who,
              }) as Route
            }
          >
            {label(row.period_start)}
            {row.unknown_count > 0 && (
              <span className="ml-2 text-caption text-warning-text">
                {translate('unknownBadge', { count: row.unknown_count })}
              </span>
            )}
          </Link>,
          ...amounts(row),
        ],
      }))}
      footer={[
        translate('total'),
        <Amount key="in" minor={totals.incomeMinor} currency={currency} kind="income" />,
        <Amount key="out" minor={totals.expenseMinor} currency={currency} />,
        <Amount key="res" minor={totals.resultMinor} currency={currency} />,
      ]}
    />
  )
}

// Figma «Saldo» → Statistics 2:73594 "Income vs expenses" (bars) and 2:77703 (the same figures as a table)
export function CashflowCard() {
  const translate = useTranslations('statistics')
  const { params, view } = useStatisticsFilters()
  const query = useQuery(statisticsQueries.cashflow(params))
  const rows = query.data ?? []

  return (
    <QueryCard
      title={translate('cashflow.title')}
      status={cardStatus(query, cashflowTotals(rows).operationsCount === 0)}
      emptyText={translate('empty.operations')}
      retryAction={query.refetch}
    >
      {view === 'chart' ? <CashflowChart rows={rows} /> : <CashflowTable rows={rows} />}
    </QueryCard>
  )
}
