'use client'

import { useFormatter, useTranslations } from 'next-intl'
import { Amount } from '@/components/ui/amount.component'
import { Badge } from '@/components/ui/badge.component'
import { useLedger } from '@/contexts/ledger.context'
import { useCalendarData } from '../hooks/calendar.hook'
import { dayDate, sumTotals } from '../utils/calendar.utils'

// Figma «Saldo» → Calendar 2:66942 totals card: Income / Expenses / Result tiles on subtle fill and the dashed «Still
// planned until 31.10» plan tile; two columns on mobile. The numbers are the period's day totals for the active filter.
export function CalendarSummary() {
  const translate = useTranslations('calendar')
  const format = useFormatter()
  const { baseCurrency } = useLedger()
  const { params, totals } = useCalendarData()
  const sum = sumTotals(totals.data ?? [])

  if (totals.isPending) {
    return <div aria-busy className="h-32 rounded-card bg-subtle" />
  }

  const until = format.dateTime(dayDate(params.to), {
    timeZone: 'UTC',
    day: '2-digit',
    month: '2-digit',
  })
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

  return (
    <section aria-busy={totals.isFetching} className="flex flex-col gap-3 rounded-card bg-card p-4 shadow-card lg:p-6">
      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tiles.map((tile) => (
          <div key={tile.key} className="flex flex-col gap-1 rounded-inner bg-subtle p-4">
            <dt className="text-caption text-text-secondary">{translate(`summary.${tile.key}`)}</dt>
            <dd>
              <Amount minor={tile.minor} currency={baseCurrency} kind={tile.kind} size="m" />
            </dd>
          </div>
        ))}
        <div className="flex flex-col gap-1 rounded-inner border border-dashed border-border-strong p-4">
          <dt className="flex flex-wrap items-center gap-2 text-caption text-text-secondary">
            {translate('summary.plan', { date: until })}
            <Badge tone="plan">{translate('day.plan')}</Badge>
          </dt>
          <dd>
            <Amount minor={sum.planMinor} currency={baseCurrency} kind="plan" size="m" />
          </dd>
        </div>
      </dl>
      <p className="text-caption text-text-secondary">
        {translate('summary.count', { count: sum.entriesCount })}
        {sum.unknownCount > 0 && ` · ${translate('summary.unknown', { count: sum.unknownCount })}`}
      </p>
    </section>
  )
}
