import { useFormatter, useTranslations } from 'next-intl'
import { Amount } from '@/components/ui/amount.component'
import { Card } from '@/components/ui/card.component'
import { CategoryBadge } from '@/components/ui/category-badge.component'
import { CATEGORY_SWATCHES, type CategoryColor } from '@/constants/category-colors.constants'
import type { Overview } from '../api/overview.api'
import { isoToDate } from '../utils/overview.utils'

type MonthCardProps = {
  overview: Overview
}

// Figma «Saldo» → Overview 2:8521 month card: three tiles in a row (gap 16; subtle fill, radius inner, padding 16, gap 4,
// label-medium, a signed M sum; on mobile 2:8962 a column of rows, gap 8, padding 12/16), the result tile with the
// «with plan to the month end» caption (label, secondary) under its sum, then the top expense categories (label-medium): CategoryBadge 40, name
// body-medium, share label, sum body-semibold, a ProgressBar 8 in the category colour under them (gap 8; rows gap 16)
export function MonthCard({ overview }: MonthCardProps) {
  const translate = useTranslations('overview')
  const format = useFormatter()
  const { month, baseCurrency } = overview
  const monthName = format.dateTime(isoToDate(overview.today), {
    timeZone: 'UTC',
    month: 'long',
  })
  const tiles: {
    key: 'income' | 'expense' | 'result'
    minor: number
    kind: 'income' | 'fact' | 'shortfall'
  }[] = [
    {
      key: 'income',
      minor: month.incomeMinor,
      kind: 'income' as const,
    },
    {
      key: 'expense',
      minor: -month.expenseMinor,
      kind: 'fact' as const,
    },
    {
      key: 'result' as const,
      minor: month.resultMinor,
      kind: month.resultMinor < 0 ? ('shortfall' as const) : ('income' as const),
    },
  ]

  return (
    <Card
      title={monthName.charAt(0).toUpperCase() + monthName.slice(1)}
      action={{
        label: translate('month.stats'),
        href: '/statistics',
      }}
    >
      <dl className="grid gap-2 lg:grid-cols-3 lg:gap-4">
        {tiles.map((tile) => (
          <div
            key={tile.key}
            className="flex flex-wrap items-center justify-between gap-1 rounded-inner bg-subtle px-4 py-3 lg:flex-col lg:flex-nowrap lg:items-start lg:justify-start lg:p-4"
          >
            <dt className="text-label font-medium text-text-secondary">{translate(`month.${tile.key}`)}</dt>
            <dd className="font-display text-number-sm">
              {tile.kind === 'income' && tile.minor > 0 ? <span className="text-positive-text">+</span> : null}
              <Amount minor={tile.minor} currency={baseCurrency} kind={tile.kind} size="m" />
            </dd>
            {tile.key === 'result' && overview.monthWithPlanMinor !== null ? (
              <dd className="basis-full text-label text-text-secondary">
                {translate('month.withPlan')}: {overview.monthWithPlanMinor > 0 ? '+' : null}
                <Amount
                  minor={overview.monthWithPlanMinor}
                  currency={baseCurrency}
                  kind="plan"
                  className="text-label font-normal"
                />
              </dd>
            ) : null}
          </div>
        ))}
      </dl>
      {month.top && month.top.length > 0 ? <TopCategories overview={overview} /> : null}
      {month.unknownCount > 0 && (
        <p className="text-caption text-text-secondary">{translate('month.unknown', { count: month.unknownCount })}</p>
      )}
    </Card>
  )
}

function TopCategories({ overview }: MonthCardProps) {
  const translate = useTranslations('overview')
  const category = (id: string) => overview.categories.find((candidate) => candidate.id === id)

  return (
    <>
      <p className="text-label font-medium text-text-secondary">{translate('month.top')}</p>
      <ul className="flex flex-col gap-4">
        {(overview.month.top ?? []).map((top) => (
          <li key={top.categoryId} className="flex items-center gap-3">
            <CategoryBadge
              icon={category(top.categoryId)?.icon ?? null}
              color={category(top.categoryId)?.color ?? null}
            />
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <p className="flex items-baseline gap-2">
                <span className="min-w-0 flex-1 truncate text-body font-medium text-text-primary">
                  {category(top.categoryId)?.name}
                </span>
                <span className="text-label text-text-secondary">{top.percent} %</span>
                <Amount minor={top.minor} currency={overview.baseCurrency} className="font-semibold" />
              </p>
              <span className="flex h-2 overflow-hidden rounded-full bg-subtle">
                <span
                  className={`rounded-full ${CATEGORY_SWATCHES[category(top.categoryId)?.color as CategoryColor] ?? 'bg-text-tertiary'}`}
                  style={{ width: `${top.percent}%` }}
                />
              </span>
            </div>
          </li>
        ))}
      </ul>
    </>
  )
}
