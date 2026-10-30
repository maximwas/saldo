'use client'

import { useQuery } from '@tanstack/react-query'
import type { Route } from 'next'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Amount } from '@/components/ui/amount.component'
import { useLedgerStore } from '@/contexts/ledger.context'
import { statisticsQueries } from '../api/statistics.queries'
import { useStatisticsFilters } from '../hooks/statistics-filters.hook'
import { cardStatus } from '../utils/statistics.utils'
import { QueryCard } from './query-card.component'
import { StatTable } from './stat-table.component'

// Subscriptions: paid in the period (fact), what the schedules plan (plan) and the monthly average; the average is shown
// as unknown, never 0, when a price is unknown. Always a table: a few rows of figures need no picture.
export function SubscriptionsCard() {
  const translate = useTranslations('statistics')
  const currency = useLedgerStore((ledger) => ledger.baseCurrency)
  const { params } = useStatisticsFilters()
  const query = useQuery(statisticsQueries.subscriptions(params))
  const rows = query.data ?? []
  const factTotal = rows.reduce((sum, row) => sum + row.fact_minor, 0)
  const planTotal = rows.reduce((sum, row) => sum + (row.plan_minor ?? 0), 0)
  const averageTotal = rows.reduce((sum, row) => sum + (row.avg_month_minor ?? 0), 0)

  return (
    <QueryCard
      title={translate('subscriptions.title')}
      action={{
        label: translate('subscriptions.open'),
        href: '/payments/subscriptions',
      }}
      status={cardStatus(query, rows.length === 0)}
      emptyText={translate('empty.subscriptions')}
      retryAction={query.refetch}
    >
      <StatTable
        caption={translate('subscriptions.title')}
        headers={[
          { label: translate('subscriptions.name') },
          {
            label: translate('subscriptions.fact'),
            end: true,
          },
          {
            label: translate('subscriptions.plan'),
            end: true,
          },
          {
            label: translate('subscriptions.average'),
            end: true,
          },
        ]}
        rows={rows.map((row) => ({
          key: row.subscription_id,
          cells: [
            <Link
              key="n"
              className="rounded-xs outline-none hover:text-primary-text focus-visible:ring-2 focus-visible:ring-primary"
              href={`/payments/subscriptions?sub=${row.subscription_id}` as Route}
            >
              {row.name}
              {row.unknown_count > 0 && (
                <span className="ml-2 text-caption text-warning-text">
                  {translate('unknownBadge', { count: row.unknown_count })}
                </span>
              )}
            </Link>,
            <Amount key="f" minor={row.fact_minor} currency={currency} />,
            <Amount key="p" minor={row.plan_minor} currency={currency} kind="plan" />,
            <Amount key="a" minor={row.avg_month_minor} currency={currency} kind="plan" />,
          ],
        }))}
        footer={[
          translate('total'),
          <Amount key="f" minor={factTotal} currency={currency} />,
          <Amount key="p" minor={planTotal} currency={currency} kind="plan" />,
          <Amount key="a" minor={averageTotal} currency={currency} kind="plan" />,
        ]}
      />
      {rows[0] && (
        <p className="text-caption text-text-secondary">
          {translate('subscriptions.months', { count: rows[0].months })}
        </p>
      )}
    </QueryCard>
  )
}
