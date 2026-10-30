'use client'

import { useFormatter, useTranslations } from 'next-intl'
import { Amount } from '@/components/ui/amount.component'
import { Badge } from '@/components/ui/badge.component'
import { useLedger } from '@/contexts/ledger.context'
import { cn } from '@/lib/utils/cn.utils'
import type { CalendarEntry } from '../api/calendar.api'
import { useCalendarData } from '../hooks/calendar.hook'
import { useCalendarParams } from '../hooks/calendar-params.hook'
import { capitalize, type DayTotals, dayDate, entryTone, groupByDay, LEGEND, monthGrid } from '../utils/calendar.utils'

const SHOWN = 3

type DayCellProps = {
  day: string
  entries: CalendarEntry[]
  totals: DayTotals | undefined
}

function DayCell({ day, entries, totals }: DayCellProps) {
  const translate = useTranslations('calendar')
  const format = useFormatter()
  const { baseCurrency } = useLedger()
  const { date, today, setUrl } = useCalendarParams()
  const inMonth = day.slice(0, 7) === date.slice(0, 7)
  const factMinor = totals ? totals.factIncomeMinor - totals.factExpenseMinor : 0
  const planMinor = totals ? totals.planInMinor - totals.planOutMinor : 0
  const hasPlan = entries.some((entry) => entry.entry === 'plan')
  const hasFact = entries.some((entry) => entry.entry === 'fact')

  return (
    <button
      type="button"
      data-day={day}
      aria-pressed={day === date}
      aria-label={translate('day.open', {
        date: format.dateTime(dayDate(day), {
          timeZone: 'UTC',
          day: 'numeric',
          month: 'long',
        }),
      })}
      onClick={() =>
        void setUrl({
          date: day,
          item: null,
        })
      }
      className={cn(
        'flex min-h-14 flex-col items-center gap-1 border-border p-1 text-left outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary lg:min-h-36 lg:items-stretch lg:border-t lg:border-l lg:p-2',
        day === date && 'rounded-inner bg-primary-soft lg:rounded-none lg:ring-2 lg:ring-inset lg:ring-primary',
      )}
    >
      <span
        className={cn(
          'flex size-7 items-center justify-center rounded-full text-label font-medium',
          inMonth ? 'text-text-primary' : 'text-text-tertiary',
          day === today && 'bg-primary text-on-primary',
        )}
      >
        {Number(day.slice(8))}
      </span>
      <span aria-hidden className="flex gap-0.5 lg:hidden">
        {entries.slice(0, SHOWN).map((entry) => (
          <span key={entry.id} className={cn('size-1.5 rounded-full', entryTone(entry))} />
        ))}
      </span>
      <span className="hidden flex-1 flex-col gap-0.5 lg:flex">
        {entries.slice(0, SHOWN).map((entry) => (
          <span key={entry.id} className="flex items-center gap-1.5 truncate text-caption text-text-primary">
            <span aria-hidden className={cn('h-3 w-0.5 shrink-0 rounded-full', entryTone(entry))} />
            <span className="truncate">{entry.title}</span>
          </span>
        ))}
        {entries.length > SHOWN && (
          <span className="text-caption text-text-tertiary">
            {translate('more', { count: entries.length - SHOWN })}
          </span>
        )}
      </span>
      {totals && (
        <span className="hidden flex-col items-start gap-1 border-t border-border pt-1 lg:flex">
          {hasPlan && <Badge tone="plan">{translate('day.plan')}</Badge>}
          {hasPlan && <Amount minor={planMinor} currency={baseCurrency} kind="plan" className="text-caption" />}
          {hasFact && <Amount minor={factMinor} currency={baseCurrency} className="text-caption" />}
        </span>
      )}
    </button>
  )
}

function useWeekdayNames(days: string[]) {
  const format = useFormatter()

  return days.slice(0, 7).map((day) =>
    capitalize(
      format.dateTime(dayDate(day), {
        timeZone: 'UTC',
        weekday: 'short',
      }),
    ),
  )
}

// Figma «Saldo» → Calendar 2:66942 (desktop: cells with up to three entries, a colour bar per source, the day's plan
// pill and fact / plan sums at the bottom, the legend below) and 2:69624 (mobile: number and up to three dots).
// Only the shown month is read: days of the neighbouring months stay empty and grey.
export function CalendarMonth() {
  const translate = useTranslations('calendar')
  const { date } = useCalendarParams()
  const { entries, totals } = useCalendarData()
  const days = monthGrid(date)
  const weekdays = useWeekdayNames(days)
  const byDay = groupByDay(entries.data ?? [])
  const totalsByDay = new Map((totals.data ?? []).map((row) => [row.day, row]))

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-hidden rounded-card bg-card p-3 shadow-card lg:p-0">
        <div aria-hidden className="grid grid-cols-7 pb-2 text-center text-caption text-text-secondary lg:py-2">
          {weekdays.map((name) => (
            <span key={name}>{name}</span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-y-1 lg:-ml-px lg:gap-y-0">
          {days.map((day) => (
            <DayCell key={day} day={day} entries={byDay.get(day) ?? []} totals={totalsByDay.get(day)} />
          ))}
        </div>
      </div>
      <ul className="hidden flex-wrap gap-x-4 gap-y-1 text-caption text-text-secondary lg:flex">
        {LEGEND.map(([key, tone]) => (
          <li key={key} className="flex items-center gap-1.5">
            <span aria-hidden className={cn('h-3 w-0.5 rounded-full', tone)} />
            {translate(`legend.${key}`)}
          </li>
        ))}
      </ul>
    </div>
  )
}
