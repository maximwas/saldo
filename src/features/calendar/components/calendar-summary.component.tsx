'use client'

import { useFormatter, useLocale, useTranslations } from 'next-intl'
import { Amount } from '@/components/ui/amount.component'
import { Bone, SkeletonCard } from '@/components/ui/skeleton.component'
import { useLedger } from '@/contexts/ledger.context'
import { formatMinor } from '@/lib/money/money.utils'
import { cn } from '@/lib/utils/cn.utils'
import { useCalendarData } from '../hooks/calendar.hook'
import { useCalendarParams } from '../hooks/calendar-params.hook'
import { dayDate, sumTotals } from '../utils/calendar.utils'

// Figma «Saldo» → Calendar 2:66942 totals (SummaryStrip 2:10082): a card, padding 20, three tiles on subtle (padding
// 12 / 16, radius md, label over the amount; the Result tile adds «with the plan to the end of the month»); on phones
// (2:69673) Income and Expenses share a row and Result takes the next one. Loading 2:79428: four subtle cells. The numbers
// are the period's day totals for the active filter.
export function CalendarSummary() {
  const translate = useTranslations('calendar')
  const format = useFormatter()
  const locale = useLocale()
  const { baseCurrency } = useLedger()
  const { view } = useCalendarParams()
  const { params, totals } = useCalendarData()
  const sum = sumTotals(totals.data ?? [])

  if (totals.isPending) {
    return (
      <SkeletonCard aria-busy className="flex-row flex-wrap gap-3 p-4 lg:p-5">
        {[0, 1, 2, 3].map((cell) => (
          <Bone key={cell} className="h-14 min-w-35 flex-1 rounded-md" />
        ))}
      </SkeletonCard>
    )
  }

  const tiles = [
    {
      key: 'income' as const,
      minor: sum.incomeMinor,
      kind: 'income' as const,
    },
    {
      key: 'expense' as const,
      minor: -sum.expenseMinor,
      kind: 'fact' as const,
    },
    {
      key: 'result' as const,
      minor: sum.resultMinor,
      kind: sum.resultMinor < 0 ? ('shortfall' as const) : ('income' as const),
    },
  ]
  const withPlan = format.dateTime(dayDate(params.to), {
    timeZone: 'UTC',
    day: '2-digit',
    month: '2-digit',
  })
  const planCaption =
    sum.planMinor === 0
      ? null
      : translate(view === 'month' || view === 'list' ? 'summary.planMonth' : 'summary.planUntil', {
          date: withPlan,
          amount: formatMinor(sum.resultMinor + sum.planMinor, baseCurrency, locale),
        })

  return (
    <section aria-busy={totals.isFetching} className="flex flex-col gap-3 rounded-card bg-card p-4 shadow-card lg:p-5">
      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {tiles.map((tile) => (
          <div
            key={tile.key}
            className={cn(
              'flex flex-col gap-1 rounded-md bg-subtle px-4 py-3',
              tile.key === 'result' && 'col-span-2 lg:col-span-1',
            )}
          >
            <dt className="text-label text-text-secondary">{translate(`summary.${tile.key}`)}</dt>
            <dd className="flex flex-col gap-1">
              <Amount minor={tile.minor} currency={baseCurrency} kind={tile.kind} size="m" />
              {tile.key === 'result' && planCaption && (
                <span className="text-label text-text-secondary">{planCaption}</span>
              )}
            </dd>
          </div>
        ))}
      </dl>
      {sum.unknownCount > 0 && (
        <p className="text-caption text-text-secondary">{translate('summary.unknown', { count: sum.unknownCount })}</p>
      )}
    </section>
  )
}
