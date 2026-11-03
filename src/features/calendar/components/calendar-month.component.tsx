'use client'

import { CalendarClock, CircleCheck } from 'lucide-react'
import { useFormatter, useTranslations } from 'next-intl'
import { useRipple } from '@/components/ui/ripple.hook'
import { cn } from '@/lib/utils/cn.utils'
import type { CalendarEntry } from '../api/calendar.api'
import { useCalendarData } from '../hooks/calendar.hook'
import { useCalendarParams } from '../hooks/calendar-params.hook'
import { useEntryType, useShortDate } from '../hooks/entry-labels.hook'
import {
  capitalize,
  cellLines,
  type DayTotals,
  dayDate,
  dayTotalLines,
  entryTone,
  groupByDay,
  LEGEND,
  monthGrid,
  paidMarks,
  weekDays,
} from '../utils/calendar.utils'
import { DaySums } from './day-sums.component'
import { EntryTrigger } from './entry-trigger.component'

const NAME_TONE = {
  plan: 'text-text-secondary',
  fact: 'text-text-primary',
} as const

type CellEntryProps = {
  entry: CalendarEntry
  /** a plan paid on another day: greyed, with a check */
  mark: boolean
}

// Figma «Saldo» → cell entries 51:126295 / 51:126301 / 55:127544: a 6 dot in the entry's colour, the name (a plan in
// secondary, a paid mark in tertiary), a 14 calendar clock on a plan or a check on a mark; it opens the entry's popup
function CellEntry({ entry, mark }: CellEntryProps) {
  const type = useEntryType()
  const plan = entry.entry === 'plan'
  const Icon = mark ? CircleCheck : CalendarClock

  return (
    <li>
      <EntryTrigger entry={entry} className="flex w-full items-center gap-1.5 rounded-xs text-caption">
        <span aria-hidden className={cn('size-1.5 shrink-0 rounded-full', entryTone(entry))} />
        <span className={cn('min-w-0 flex-1 truncate', mark ? 'text-text-tertiary' : NAME_TONE[entry.entry])}>
          {entry.title ?? type(entry)}
        </span>
        {mark || plan ? <Icon aria-hidden className="size-3.5 shrink-0 text-text-secondary" /> : null}
      </EntryTrigger>
    </li>
  )
}

type DayCellProps = {
  day: string
  /** a weekend day or a day outside the shown month: on the app ground */
  muted: boolean
  /** a day of the shown month or week; other days stay empty */
  inPeriod: boolean
  entries: CalendarEntry[]
  /** facts that paid this day's plan on another day */
  marks: CalendarEntry[]
  totals: DayTotals | undefined
}

// Figma «Saldo» → cells 51:126290 / 51:126317 / 55:127540 (desktop: 192 high, padding 8, right / bottom hairlines; up to
// three entries and «more N»; «Spent» / «Planned» at the bottom, «Paid 03.11» for a plan paid on another day) and
// 2:10880 (phones: 56 high, the number over up to three dots). Selected = primary-soft ground only, today = the filled
// number. The cell selects its day; an entry inside it opens its popup. A busy day grows its week row past 192 rather
// than cut its sums.
function DayCell({ day, muted, inPeriod, entries, marks, totals }: DayCellProps) {
  const translate = useTranslations('calendar')
  const format = useFormatter()
  const short = useShortDate()
  const { pressProps, ripple } = useRipple()
  const { date, today, setUrl } = useCalendarParams()
  const selected = day === date
  const { shown, more } = cellLines([
    ...entries.map((entry) => ({
      entry,
      mark: false,
    })),
    ...marks.map((entry) => ({
      entry,
      mark: true,
    })),
  ])
  const paidDays = [...new Set(marks.map((entry) => short(entry.day)))]
  const hasSums = dayTotalLines(totals).length > 0 || paidDays.length > 0

  return (
    <div
      data-day={day}
      className={cn(
        'relative flex h-14 flex-col items-center gap-1 overflow-hidden rounded-md py-1.5 transition-colors lg:h-auto lg:min-h-48 lg:items-stretch lg:rounded-none lg:border-r lg:border-b lg:border-border lg:p-2',
        selected && 'bg-primary-soft',
        !selected && [muted ? 'lg:bg-app' : 'lg:bg-card', 'hover:bg-subtle lg:hover:bg-subtle'],
      )}
    >
      <button
        type="button"
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
        className="absolute inset-0 cursor-pointer overflow-hidden rounded-md outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary lg:rounded-none"
        {...pressProps}
      >
        {ripple}
      </button>
      <span
        className={cn(
          'flex size-7 shrink-0 items-center justify-center rounded-full text-label font-medium lg:size-6 lg:font-semibold',
          inPeriod ? 'text-text-primary' : 'text-text-tertiary',
          day === today && 'bg-primary text-on-primary',
        )}
      >
        {Number(day.slice(8))}
      </span>
      <span aria-hidden className="flex gap-0.5 lg:hidden">
        {shown.map(({ entry }) => (
          <span key={entry.id} className={cn('size-1.5 rounded-full', entryTone(entry))} />
        ))}
      </span>
      <ul className="relative hidden min-w-0 flex-col gap-0.5 lg:flex">
        {shown.map(({ entry, mark }) => (
          <CellEntry key={`${mark ? 'mark' : 'entry'}-${entry.id}`} entry={entry} mark={mark} />
        ))}
        {more > 0 && <li className="pl-3 text-caption text-text-tertiary">{translate('more', { count: more })}</li>}
      </ul>
      {hasSums && (
        <div className="mt-auto hidden flex-col gap-0.5 border-t border-border pt-1.5 lg:flex">
          <DaySums totals={totals} layout="cell" />
          {paidDays.length > 0 && (
            <span className="text-caption text-text-tertiary">
              {translate('paidOn', { date: paidDays.join(', ') })}
            </span>
          )}
        </div>
      )}
    </div>
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

// Figma «Saldo» → «How to read» 51:126513 and «Colours» 51:126598 under the grid: what the clock, the check and the
// sums at the bottom of a cell mean, then the dot colour of each kind of entry
function Legend() {
  const translate = useTranslations('calendar')

  return (
    <div className="hidden flex-col gap-2 text-label text-text-secondary lg:flex">
      <ul className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <li className="flex items-center gap-1.5">
          <CalendarClock aria-hidden className="size-4 shrink-0" />
          {translate('howTo.planned')}
        </li>
        <li className="flex items-center gap-1.5">
          <CircleCheck aria-hidden className="size-4 shrink-0" />
          {translate('howTo.paid')}
        </li>
        <li>{translate('howTo.totals')}</li>
      </ul>
      <ul className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <li>{translate('howTo.colours')}</li>
        {LEGEND.map(([key, tone]) => (
          <li key={key} className="flex items-center gap-1.5">
            <span aria-hidden className={cn('size-2 rounded-full', tone)} />
            {translate(`legend.${key}`)}
          </li>
        ))}
      </ul>
    </div>
  )
}

// Figma «Saldo» → Calendar 51:125110 (desktop: weekday strip on subtle, the cells, the legend below; the grid has top /
// left hairlines, every cell right / bottom) and 2:69624 (phones: a card, padding 12 / 8, weekdays in micro, number and
// dots). The week view is the same cells for Monday to Sunday. Only the shown period is read: days of the neighbouring
// months stay empty and grey.
export function CalendarMonth() {
  const { view, date } = useCalendarParams()
  const { entries, totals } = useCalendarData()
  const week = view === 'week'
  const days = week ? weekDays(date) : monthGrid(date)
  const weekdays = useWeekdayNames(days)
  const byDay = groupByDay(entries.data ?? [])
  const marks = paidMarks(entries.data ?? [])
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
          {days.map((day, index) => {
            const inPeriod = week || day.slice(0, 7) === date.slice(0, 7)

            return (
              <DayCell
                key={day}
                day={day}
                muted={!inPeriod || index % 7 > 4}
                inPeriod={inPeriod}
                entries={byDay.get(day) ?? []}
                marks={inPeriod ? (marks.get(day) ?? []) : []}
                totals={totalsByDay.get(day)}
              />
            )
          })}
        </div>
      </div>
      <Legend />
    </div>
  )
}
