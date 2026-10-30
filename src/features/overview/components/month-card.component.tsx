import { useFormatter, useTranslations } from 'next-intl'
import { Amount } from '@/components/ui/amount.component'
import { Card } from '@/components/ui/card.component'
import type { Overview } from '../api/overview.api'
import { isoToDate } from '../utils/overview.utils'

type MonthCardProps = {
  overview: Overview
}

// Figma «Saldo» → Overview 2:8237 month card month: three tiles  /  /  on subtle fill
// (a column of rows on mobile). The top-categories list under it waits for the categories feature (plan 1.6).
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
      minor: month.expenseMinor,
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
      <dl className="grid gap-3 lg:grid-cols-3">
        {tiles.map((tile) => (
          <div
            key={tile.key}
            className="flex items-center justify-between gap-1 rounded-inner bg-subtle px-4 py-3 lg:flex-col lg:items-start lg:p-4"
          >
            <dt className="text-caption text-text-secondary">{translate(`month.${tile.key}`)}</dt>
            <dd>
              <Amount minor={tile.minor} currency={baseCurrency} kind={tile.kind} size="m" />
            </dd>
          </div>
        ))}
      </dl>
      {month.unknownCount > 0 && (
        <p className="text-caption text-text-secondary">{translate('month.unknown', { count: month.unknownCount })}</p>
      )}
    </Card>
  )
}
