'use client'

import { useFormatter, useTranslations } from 'next-intl'
import { Amount } from '@/components/ui/amount.component'
import { useLedger } from '@/contexts/ledger.context'
import { cn } from '@/lib/utils/cn.utils'
import type { CalendarEntry } from '../api/calendar.api'
import { useCalendarData } from '../hooks/calendar.hook'
import { useCalendarParams } from '../hooks/calendar-params.hook'
import { capitalize, type DayTotals, dayDate, entryTone, groupByDay, LEGEND, monthGrid } from '../utils/calendar.utils'
import { EntryLine } from './calendar-entry.component'

const SHOWN = 3

type DayCellProps = {
  day: string
  /** 0 = Monday … 6 = Sunday */
  column: number
  entries: CalendarEntry[]
  totals: DayTotals | undefined
}

function DayCell({ day, column, entries, totals }: DayCellProps) {
  const translate = useTranslations('calendar')
  const format = useFormatter()
  const { baseCurrency } = useLedger()
  const { date, today, setUrl } = useCalendarParams()
  const inMonth = day.slice(0, 7) === date.slice(0, 7)
  const selected = day === date
  const factMinor = totals ? totals.factIncomeMinor - totals.factExpenseMinor : 0
  const planMinor = totals ? totals.planInMinor - totals.planOutMinor : 0
  const hasPlan = entries.some((entry) => entry.entry === 'plan')
  const hasFact = entries.some((entry) => entry.entry === 'fact')

  return (
    <button
      type="button"
      data-day={day}
      aria-pressed={selected}
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
      // Figma CalendarDay 2:10880 (mobile: 56 high, rounded md, number over dots) and 2:10855 (desktop: 192 high, padding 8,
      // gap 6, right / bottom hairlines; weekend and neighbouring-month days on the app ground; selected: primary border + soft fill)
      className={cn(
        'flex h-14 flex-col items-center gap-1 rounded-md py-1.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary lg:h-48 lg:items-stretch lg:gap-1.5 lg:rounded-none lg:border-r lg:border-b lg:border-border lg:p-2',
        !inMonth || column > 4 ? 'lg:bg-app' : 'lg:bg-card',
        selected && 'bg-primary-soft lg:border lg:border-primary',
      )}
    >
      <span
        className={cn(
          'flex size-7 shrink-0 items-center justify-center rounded-full text-label font-medium lg:size-6 lg:font-semibold',
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
      <span className="hidden min-w-0 flex-1 flex-col lg:flex">
        {entries.slice(0, SHOWN).map((entry) => (
          <EntryLine key={entry.id} entry={entry} name={entry.title ?? ''} />
        ))}
        {entries.length > SHOWN && (
          <span className="text-caption text-text-secondary">
            {translate('more', { count: entries.length - SHOWN })}
          </span>
        )}
      </span>
      {totals && (
        <span className="hidden flex-col border-t border-border pt-1.5 lg:flex">
          {hasPlan && (
            <span className="flex flex-wrap items-center gap-1 gap-y-0.5">
              <span className="rounded-full border border-border-strong px-2.5 py-0.5 text-caption font-medium text-text-secondary">
                {translate('day.plan')}
              </span>
              <Amount minor={planMinor} currency={baseCurrency} kind="plan" className="text-caption font-normal" />
            </span>
          )}
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

// Figma «Saldo» → Calendar 2:66942 (desktop: weekday strip on subtle, cells with up to three entries, the day's plan pill
// and fact / plan sums at the bottom, the legend below; the grid has top / left hairlines, every cell right / bottom) and
// 2:69624 (mobile: a card, padding 12 / 8, weekdays in micro, number and up to three dots). Only the shown month is
// read: days of the neighbouring months stay empty and grey.
export function CalendarMonth() {
  const translate = useTranslations('calendar')
  const { date } = useCalendarParams()
  const { entries, totals } = useCalendarData()
  const days = monthGrid(date)
  const weekdays = useWeekdayNames(days)
  const byDay = groupByDay(entries.data ?? [])
  const totalsByDay = new Map((totals.data ?? []).map((row) => [row.day, row]))

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1 overflow-hidden rounded-card bg-card px-2 py-3 shadow-card lg:gap-0 lg:border-t lg:border-l lg:border-border lg:p-0">
        <div
          aria-hidden
          className="grid grid-cols-7 pb-1 text-center text-micro text-text-tertiary lg:border-r lg:border-b lg:border-border lg:bg-subtle lg:py-2 lg:pb-2 lg:text-caption lg:font-medium lg:text-text-secondary"
        >
          {weekdays.map((name) => (
            <span key={name}>{name}</span>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {days.map((day, index) => (
            <DayCell
              key={day}
              day={day}
              column={index % 7}
              entries={byDay.get(day) ?? []}
              totals={totalsByDay.get(day)}
            />
          ))}
        </div>
      </div>
      <ul className="hidden flex-wrap gap-x-4 gap-y-2 text-label text-text-secondary lg:flex">
        {LEGEND.map(([key, tone]) => (
          <li key={key} className="flex items-center gap-2">
            <span aria-hidden className={cn('h-3.5 w-0.75 rounded-full', tone)} />
            {translate(`legend.${key}`)}
          </li>
        ))}
      </ul>
    </div>
  )
}
