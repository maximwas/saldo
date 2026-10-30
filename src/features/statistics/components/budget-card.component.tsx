'use client'

import { useQuery } from '@tanstack/react-query'
import { useFormatter, useTranslations } from 'next-intl'
import { Amount } from '@/components/ui/amount.component'
import { useLedgerStore } from '@/contexts/ledger.context'
import type { BudgetRow } from '../api/statistics.api'
import { statisticsQueries } from '../api/statistics.queries'
import { useStatisticsFilters } from '../hooks/statistics-filters.hook'
import { cardStatus } from '../utils/statistics.utils'
import { BarsChart } from './bars-chart.component'
import { QueryCard } from './query-card.component'
import { StatTable } from './stat-table.component'

function useMonthLabel() {
  const format = useFormatter()

  return (month: string) =>
    format.dateTime(new Date(`${month}T12:00:00Z`), {
      month: 'short',
      timeZone: 'UTC',
    })
}

/** what a month may spend: the limits plus what was carried in; null = no limits, never 0 */
const available = (row: BudgetRow) => (row.limit_minor === null ? null : row.limit_minor + row.carried_in_minor)

function BudgetChart({ rows }: { rows: BudgetRow[] }) {
  const translate = useTranslations('statistics')
  const currency = useLedgerStore((ledger) => ledger.baseCurrency)
  const label = useMonthLabel()

  return (
    <BarsChart
      currency={currency}
      summary={translate('budget.summary', { count: rows.length })}
      series={[
        {
          key: 'plan',
          name: translate('budget.plan'),
          fill: 'var(--color-neutral)',
        },
        {
          key: 'fact',
          name: translate('budget.fact'),
          fill: 'var(--color-primary)',
        },
      ]}
      data={rows.map((row) => ({
        label: label(row.month),
        plan: available(row),
        fact: row.limit_minor === null ? null : row.limited_fact_minor,
      }))}
    />
  )
}

function BudgetTable({ rows }: { rows: BudgetRow[] }) {
  const translate = useTranslations('statistics')
  const currency = useLedgerStore((ledger) => ledger.baseCurrency)
  const label = useMonthLabel()
  const dash = <span className="text-text-tertiary">—</span>

  return (
    <StatTable
      caption={translate('budget.title')}
      headers={[
        { label: translate('cashflow.period') },
        {
          label: translate('budget.incomePlan'),
          end: true,
        },
        {
          label: translate('budget.incomeFact'),
          end: true,
        },
        {
          label: translate('budget.limit'),
          end: true,
        },
        {
          label: translate('budget.carried'),
          end: true,
        },
        {
          label: translate('budget.limitedFact'),
          end: true,
        },
        {
          label: translate('budget.allExpenses'),
          end: true,
        },
      ]}
      rows={rows.map((row) => ({
        key: row.month,
        cells: [
          <span key="m">
            {label(row.month)}
            {row.unknown_count > 0 && (
              <span className="ml-2 text-caption text-warning-text">
                {translate('unknownBadge', { count: row.unknown_count })}
              </span>
            )}
          </span>,
          row.income_plan_minor === null ? (
            dash
          ) : (
            <Amount key="ip" minor={row.income_plan_minor} currency={currency} kind="plan" />
          ),
          <Amount key="if" minor={row.income_fact_minor} currency={currency} kind="income" />,
          row.limit_minor === null ? dash : <Amount key="l" minor={row.limit_minor} currency={currency} kind="plan" />,
          <Amount key="c" minor={row.carried_in_minor} currency={currency} kind="plan" />,
          <Amount key="lf" minor={row.limited_fact_minor} currency={currency} />,
          <Amount key="ae" minor={row.expense_fact_minor} currency={currency} />,
        ],
      }))}
    />
  )
}

// plan ≠ fact (§11): limits and the income plan are what was entered, the facts are what happened; they never merge
export function BudgetCard() {
  const translate = useTranslations('statistics')
  const { params, view } = useStatisticsFilters()
  const query = useQuery(statisticsQueries.budget(params))
  const rows = query.data ?? []
  const hasLimits = rows.some((row) => row.limit_minor !== null)

  return (
    <QueryCard
      title={translate('budget.title')}
      action={{
        label: translate('budget.open'),
        href: '/budget',
      }}
      status={cardStatus(query, !hasLimits && rows.every((row) => row.income_plan_minor === null))}
      emptyText={translate('empty.budget')}
      retryAction={query.refetch}
    >
      {view === 'chart' && hasLimits ? <BudgetChart rows={rows} /> : <BudgetTable rows={rows} />}
    </QueryCard>
  )
}
