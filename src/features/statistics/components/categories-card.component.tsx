'use client'

import { useQuery } from '@tanstack/react-query'
import type { Route } from 'next'
import Link from 'next/link'
import { useFormatter, useTranslations } from 'next-intl'
import { Pie, PieChart, ResponsiveContainer } from 'recharts'
import { Amount } from '@/components/ui/amount.component'
import { useLedgerStore } from '@/contexts/ledger.context'
import { cn } from '@/lib/utils/cn.utils'
import { statisticsQueries } from '../api/statistics.queries'
import { useStatisticsFilters } from '../hooks/statistics-filters.hook'
import { type CategoryShare, cardStatus, categoryShares } from '../utils/statistics.utils'
import { linkPeriod, operationsHref } from '../utils/statistics-period.utils'
import { QueryCard } from './query-card.component'
import { StatTable } from './stat-table.component'

const LINK =
  'rounded-xs text-text-primary outline-none hover:text-primary-text focus-visible:ring-2 focus-visible:ring-primary'

type Shares = ReturnType<typeof categoryShares>

const ROW_CLASS = 'flex h-10 items-center gap-3 border-b border-border text-label'

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

const MOBILE_ROWS = 4

/** below lg the legend keeps the biggest four and sums the rest into one «Others (N)» row (Figma 2:78090) */
function OthersRow({ data }: { data: Shares }) {
  const translate = useTranslations('statistics')
  const currency = useLedgerStore((ledger) => ledger.baseCurrency)
  const shareText = useShareText()
  const rest = data.shares.slice(MOBILE_ROWS)

  if (rest.length === 0) {
    return null
  }

  return (
    <li className={cn(ROW_CLASS, 'lg:hidden')}>
      <span aria-hidden className="size-2.5 shrink-0 rounded-full bg-border-strong" />
      <span className="min-w-0 flex-1 truncate">{translate('others', { count: rest.length })}</span>
      <span className="w-14 text-right text-text-secondary tabular-nums">
        {shareText(rest.reduce((sum, share) => sum + share.share, 0))}
      </span>
      <Amount
        minor={rest.reduce((sum, share) => sum + share.factMinor, 0)}
        currency={currency}
        className="w-30 text-right text-label font-semibold"
      />
    </li>
  )
}

// Figma «Saldo» → Statistics 2:73594 "Expenses by category": a 220 donut (180 on mobile) with the total in the middle,
// the legend beside it (40 high rows, a 10 swatch, share 56 and amount 120 wide, both on the right)
type CategoriesChartProps = {
  data: Shares
  /** the phone table shows the legend list alone */
  donut?: boolean
}

function CategoriesChart({ data, donut = true }: CategoriesChartProps) {
  const translate = useTranslations('statistics')
  const currency = useLedgerStore((ledger) => ledger.baseCurrency)
  const shareText = useShareText()
  const drawn = data.shares.filter((share) => share.factMinor > 0)

  return (
    <div className="flex flex-col items-center gap-4 lg:flex-row lg:gap-8">
      <div
        role="img"
        aria-label={translate('categories.summary', { count: drawn.length })}
        className={cn('relative size-45 shrink-0 lg:size-55', !donut && 'hidden')}
      >
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              isAnimationActive={false}
              data={drawn}
              dataKey="factMinor"
              nameKey="name"
              innerRadius="64%"
              stroke="none"
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-caption text-text-secondary">{translate('summary.expense')}</span>
          <Amount minor={data.totalMinor} currency={currency} className="max-lg:text-label max-lg:font-semibold" />
        </div>
      </div>
      <ul className="w-full flex-1">
        {data.shares.map((share, index) => (
          <li key={share.id ?? 'none'} className={cn(ROW_CLASS, index >= MOBILE_ROWS && 'max-lg:hidden')}>
            <span aria-hidden className="size-2.5 shrink-0 rounded-full" style={{ background: share.fill }} />
            <span className="min-w-0 flex-1 truncate">
              <CategoryName share={share} />
            </span>
            <span className="w-14 text-right text-text-secondary tabular-nums">{shareText(share.share)}</span>
            <Amount minor={share.factMinor} currency={currency} className="w-30 text-right text-label font-semibold" />
          </li>
        ))}
        <OthersRow data={data} />
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
          <span key="name" className="flex items-center gap-3">
            <span aria-hidden className="size-2.5 shrink-0 rounded-full" style={{ background: share.fill }} />
            <CategoryName share={share} />
          </span>,
          shareText(share.share),
          <Amount key="sum" minor={share.factMinor} currency={currency} />,
        ],
      }))}
      footer={[
        translate('total'),
        shareText(data.shares.some((share) => share.share > 0) ? 100 : 0),
        <Amount key="total" minor={data.totalMinor} currency={currency} />,
      ]}
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
      {view === 'chart' ? (
        <CategoriesChart data={data} />
      ) : (
        <>
          {/* Figma 4:79439: the phone table is the legend list without the donut */}
          <div className="lg:hidden">
            <CategoriesChart data={data} donut={false} />
          </div>
          <div className="max-lg:hidden">
            <CategoriesTable data={data} />
          </div>
        </>
      )}
      {data.unknownCount > 0 && (
        <p className="text-caption text-warning-text">{translate('unknownNote', { count: data.unknownCount })}</p>
      )}
    </QueryCard>
  )
}
