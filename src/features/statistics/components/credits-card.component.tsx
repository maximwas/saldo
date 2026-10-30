'use client'

import { useQuery } from '@tanstack/react-query'
import type { Route } from 'next'
import Link from 'next/link'
import { useFormatter, useTranslations } from 'next-intl'
import { Amount } from '@/components/ui/amount.component'
import { useLedgerStore } from '@/contexts/ledger.context'
import type { CreditRow } from '../api/statistics.api'
import { statisticsQueries } from '../api/statistics.queries'
import { useStatisticsFilters } from '../hooks/statistics-filters.hook'
import { cardStatus } from '../utils/statistics.utils'
import { QueryCard } from './query-card.component'
import { StatTable } from './stat-table.component'

function useDayText() {
  const format = useFormatter()
  const dash = <span className="text-text-tertiary">—</span>

  return (day: string | null) =>
    day
      ? format.dateTime(new Date(`${day}T12:00:00Z`), {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          timeZone: 'UTC',
        })
      : dash
}

function CreditsTable({ rows }: { rows: CreditRow[] }) {
  const translate = useTranslations('statistics')
  const currency = useLedgerStore((ledger) => ledger.baseCurrency)
  const dayText = useDayText()
  // a total that includes an unknown amount is unknown itself
  const remaining = rows.some((row) => row.remaining_base_minor === null)
    ? null
    : rows.reduce((sum, row) => sum + (row.remaining_base_minor ?? 0), 0)

  return (
    <StatTable
      caption={translate('credits.title')}
      headers={[
        { label: translate('credits.name') },
        {
          label: translate('credits.paid'),
          end: true,
        },
        {
          label: translate('credits.remaining'),
          end: true,
        },
        {
          label: translate('credits.next'),
          end: true,
        },
        {
          label: translate('credits.payoff'),
          end: true,
        },
        {
          label: translate('credits.inPeriod'),
          end: true,
        },
      ]}
      rows={rows.map((row) => ({
        key: row.credit_id,
        cells: [
          <Link
            key="n"
            className="rounded-xs outline-none hover:text-primary-text focus-visible:ring-2 focus-visible:ring-primary"
            href={`/payments/credits/${row.credit_id}` as Route}
          >
            {row.name}
            {row.unknown_count > 0 && (
              <span className="ml-2 text-caption text-warning-text">
                {translate('unknownBadge', { count: row.unknown_count })}
              </span>
            )}
          </Link>,
          `${row.paid_count} / ${row.installments_count}`,
          <Amount key="r" minor={row.remaining_base_minor} currency={currency} />,
          dayText(row.next_due_on),
          dayText(row.payoff_on),
          <Amount key="p" minor={row.period_paid_minor} currency={currency} />,
        ],
      }))}
      footer={[
        translate('total'),
        '',
        <Amount key="r" minor={remaining} currency={currency} />,
        '',
        '',
        <Amount key="p" minor={rows.reduce((sum, row) => sum + row.period_paid_minor, 0)} currency={currency} />,
      ]}
    />
  )
}

// Credit load and payoff: what was paid in the period, what is left and when the last installment is due.
// The purchase price never counts here, only installments (§20).
export function CreditsCard() {
  const translate = useTranslations('statistics')
  const { params } = useStatisticsFilters()
  const query = useQuery(statisticsQueries.credits(params))
  const rows = (query.data ?? []).filter((row) => row.status !== 'closed' || row.period_paid_count > 0)

  return (
    <QueryCard
      title={translate('credits.title')}
      action={{
        label: translate('credits.open'),
        href: '/payments/credits',
      }}
      status={cardStatus(query, rows.length === 0)}
      emptyText={translate('empty.credits')}
      retryAction={query.refetch}
    >
      <CreditsTable rows={rows} />
    </QueryCard>
  )
}
