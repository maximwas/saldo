'use client'

import { useQuery } from '@tanstack/react-query'
import type { Route } from 'next'
import Link from 'next/link'
import { useFormatter, useTranslations } from 'next-intl'
import { Pie, PieChart, ResponsiveContainer } from 'recharts'
import { Amount } from '@/components/ui/amount.component'
import { useLedgerStore } from '@/contexts/ledger.context'
import { statisticsQueries } from '../api/statistics.queries'
import { useStatisticsFilters } from '../hooks/statistics-filters.hook'
import { type CategoryShare, cardStatus, categoryShares } from '../utils/statistics.utils'
import { linkPeriod, operationsHref } from '../utils/statistics-period.utils'
import { QueryCard } from './query-card.component'
import { StatTable } from './stat-table.component'

const LINK =
  'rounded-xs text-text-primary outline-none hover:text-primary-text focus-visible:ring-2 focus-visible:ring-primary'

type Shares = ReturnType<typeof categoryShares>

function useShareText() {
  const format = useFormatter()

  return (share: number) =>
    format.number(share / 100, {
      style: 'percent',
      maximumFractionDigits: 1,
    })
}

/** the category name, a link to its operations of the period (none for «no category»: the list has no such filter) */
function CategoryName({ share }: { share: CategoryShare }) {
  const translate = useTranslations('statistics')
  const { period, who } = useStatisticsFilters()
  const name = share.name ?? translate('noCategory')

  if (!share.id) {
    return <span>{name}</span>
  }

  return (
    <Link
      className={LINK}
      href={
        operationsHref({
          period: linkPeriod(period),
          category: share.id,
          who,
          type: 'expense',
        }) as Route
      }
    >
      {name}
    </Link>
  )
}

// Figma «Saldo» → Statistics 2:73594 "Expenses by category": a donut with the total in the middle, the legend list beside
function CategoriesChart({ data }: { data: Shares }) {
  const translate = useTranslations('statistics')
  const currency = useLedgerStore((ledger) => ledger.baseCurrency)
  const shareText = useShareText()
  const drawn = data.shares.filter((share) => share.factMinor > 0)

  return (
    <div className="flex flex-col items-center gap-6 lg:flex-row">
      <div
        role="img"
        aria-label={translate('categories.summary', { count: drawn.length })}
        className="relative size-56 shrink-0"
      >
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              isAnimationActive={false}
              data={drawn}
              dataKey="factMinor"
              nameKey="name"
              innerRadius="62%"
              stroke="var(--color-card)"
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-caption text-text-secondary">{translate('summary.expense')}</span>
          <Amount minor={data.totalMinor} currency={currency} size="s" />
        </div>
      </div>
      <ul className="w-full">
        {data.shares.map((share) => (
          <li key={share.id ?? 'none'} className="flex items-center gap-3 border-b border-border py-2 text-label">
            <span aria-hidden className="size-2.5 shrink-0 rounded-full" style={{ background: share.fill }} />
            <span className="min-w-0 flex-1 truncate">
              <CategoryName share={share} />
            </span>
            <span className="text-text-secondary tabular-nums">{shareText(share.share)}</span>
            <Amount minor={share.factMinor} currency={currency} />
          </li>
        ))}
      </ul>
    </div>
  )
}

function CategoriesTable({ data }: { data: Shares }) {
  const translate = useTranslations('statistics')
  const currency = useLedgerStore((ledger) => ledger.baseCurrency)
  const shareText = useShareText()

  return (
    <StatTable
      caption={translate('categories.title')}
      headers={[
        { label: translate('categories.category') },
        {
          label: translate('categories.share'),
          end: true,
        },
        {
          label: translate('categories.amount'),
          end: true,
        },
      ]}
      rows={data.shares.map((share) => ({
        key: share.id ?? 'none',
        cells: [
          <CategoryName key="name" share={share} />,
          shareText(share.share),
          <Amount key="sum" minor={share.factMinor} currency={currency} />,
        ],
      }))}
      footer={[translate('total'), '', <Amount key="total" minor={data.totalMinor} currency={currency} />]}
    />
  )
}

export function CategoriesCard() {
  const translate = useTranslations('statistics')
  const { params, view, period, who } = useStatisticsFilters()
  const ledgerId = useLedgerStore((ledger) => ledger.ledgerId)
  const query = useQuery(statisticsQueries.byCategory(params))
  const options = useQuery(statisticsQueries.categories(ledgerId))
  const names = Object.fromEntries(
    (options.data ?? []).map((category) => [
      category.id,
      {
        name: category.name,
        color: category.color,
      },
    ]),
  )
  const data = categoryShares(query.data ?? [], names)

  return (
    <QueryCard
      title={translate('categories.title')}
      action={{
        label: translate('toOperations'),
        href: operationsHref({
          period: linkPeriod(period),
          who,
          type: 'expense',
        }),
      }}
      status={cardStatus(query, data.shares.length === 0)}
      emptyText={translate('empty.categories')}
      retryAction={query.refetch}
    >
      {view === 'chart' ? <CategoriesChart data={data} /> : <CategoriesTable data={data} />}
      {data.unknownCount > 0 && (
        <p className="text-caption text-warning-text">{translate('unknownNote', { count: data.unknownCount })}</p>
      )}
    </QueryCard>
  )
}
