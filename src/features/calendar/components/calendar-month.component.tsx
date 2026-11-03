'use client'

import { CalendarClock, CircleCheck } from 'lucide-react'
import { useFormatter, useTranslations } from 'next-intl'
import { useRipple } from '@/components/ui/ripple.hook'
import { cn } from '@/lib/utils/cn.utils'
import { useIsWideLayout } from '@/lib/utils/media-query.hook'
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
        <span aria-hidden className={cn('size-1.5 shrink-0 rounded-full bg-current', entryTone(entry))} />
        <span className={cn('min-w-0 flex-1 truncate', mark ? 'text-text-tertiary' : NAME_TONE[entry.entry])}>
          {entry.title ?? type(entry)}
        </span>
        {mark || plan ? <Icon aria-hidden className="size-3.5 shrink-0 text-text-secondary" /> : null}
      </EntryTrigger>
    </li>
  )
}

type PhoneMarkProps = {
  entry: CalendarEntry
  /** a plan paid on another day */
  mark: boolean
}

// Figma «Saldo» → phone month 59:129461: an 8 mark in the entry's colour, filled once it happened that day, outlined
// while it is planned and not paid, grey for a plan paid earlier on another day (the legend under the grid says so)
function PhoneMark({ entry, mark }: PhoneMarkProps) {
  const shape = entry.entry === 'plan' ? 'border-2 border-current' : 'bg-current'

  return <span className={cn('size-2 rounded-full', mark ? 'bg-neutral' : [entryTone(entry), shape])} />
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

// Figma «Saldo» → cells 51:126290 / 51:126317 / 55:127540 (desktop month: 192 high, padding 8, right / bottom
// hairlines; up to three entries and «more N»; «Spent» / «Planned» at the bottom, «Paid 03.11» for a plan paid on
// another day), the week tiles 59:128610 (desktop: 240 high, radius md, a hairline round, the number and the weekday
// on top, a click opens the day) and 59:129461 (phones: 48 high, the 24 number over up to three 8 marks; days of
// other months stay empty). Selected = primary-soft ground only, today = the filled number. The cell selects its day;
// an entry inside it opens its popup. A busy day grows its week row past 192 rather than cut its sums.
function DayCell({ day, muted, inPeriod, entries, marks, totals }: DayCellProps) {
  const translate = useTranslations('calendar')
  const format = useFormatter()
  const short = useShortDate()
  const wide = useIsWideLayout()
  const { pressProps, ripple } = useRipple()
  const { view, date, today, setUrl } = useCalendarParams()
  const week = view === 'week'
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
  const weekday = format.dateTime(dayDate(day), {
    timeZone: 'UTC',
    weekday: 'short',
  })

  return (
    <div
      data-day={day}
      className={cn(
        'relative flex h-12 flex-col items-center gap-1 overflow-hidden rounded-md pt-1.5 transition-colors lg:h-auto lg:items-stretch lg:p-2',
        week
          ? 'lg:min-h-60 lg:border lg:border-border'
          : 'lg:min-h-48 lg:rounded-none lg:border-r lg:border-b lg:border-border',
        !inPeriod && 'max-lg:invisible',
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
            // the desktop week has no side card: its day opens the day view (Figma 59:128610)
            ...(week &&
              wide && {
                view: 'day' as const,
              }),
          })
        }
        className={cn(
          'absolute inset-0 cursor-pointer overflow-hidden rounded-md outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary',
          !week && 'lg:rounded-none',
        )}
        {...pressProps}
      >
        {ripple}
      </button>
      <span className="flex items-center gap-1.5">
        <span
          className={cn(
            'flex size-6 shrink-0 items-center justify-center rounded-full text-label font-medium lg:font-semibold',
            inPeriod ? 'text-text-primary' : 'text-text-tertiary',
            day === today && 'bg-primary font-semibold text-on-primary',
          )}
        >
          {Number(day.slice(8))}
        </span>
        {week && <span className="hidden text-caption text-text-tertiary lg:inline">{capitalize(weekday)}</span>}
      </span>
      <span aria-hidden className="flex gap-0.5 lg:hidden">
        {shown.map(({ entry, mark }) => (
          <PhoneMark key={`${mark ? 'mark' : 'entry'}-${entry.id}`} entry={entry} mark={mark} />
        ))}
      </span>
      <ul className="relative hidden min-w-0 flex-col gap-0.5 lg:flex">
        {shown.map(({ entry, mark }) => (
          <CellEntry key={`${mark ? 'mark' : 'entry'}-${entry.id}`} entry={entry} mark={mark} />
        ))}
        {more > 0 && (
          <li className="pl-3 text-caption text-text-tertiary">
            {translate('more', {
              count: more,
            })}
          </li>
        )}
      </ul>
      {hasSums && (
        <div className="mt-auto hidden flex-col gap-0.5 border-t border-border pt-1.5 lg:flex">
          <DaySums totals={totals} layout="cell" />
          {paidDays.length > 0 && (
            <span className="text-caption text-text-tertiary">
              {translate('paidOn', {
                date: paidDays.join(', '),
              })}
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

const PHONE_LEGEND = [
  ['paid', 'bg-primary'],
  ['planned', 'border-2 border-primary'],
  ['paidEarlier', 'bg-neutral'],
] as const

// Figma «Saldo» → «How to read» 51:126513 and «Colours» 51:126598 under the desktop grid: what the clock, the check and
// the sums at the bottom of a cell mean, then the dot colour of each kind of entry (the week 59:128610 says «at the
// bottom of a day» and has no colours); phones 59:129601: what a filled, an outlined and a grey mark mean, in words
function Legend() {
  const translate = useTranslations('calendar')
  const week = useCalendarParams().view === 'week'

  return (
    <>
      <ul className="flex flex-wrap items-center gap-x-4 gap-y-2 text-label text-text-secondary lg:hidden">
        {PHONE_LEGEND.map(([key, shape]) => (
          <li key={key} className="flex items-center gap-1.5">
            <span aria-hidden className={cn('size-2 shrink-0 rounded-full', shape)} />
            {translate(`howTo.marks.${key}`)}
          </li>
        ))}
      </ul>
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
          <li>{translate(week ? 'howTo.totalsDay' : 'howTo.totals')}</li>
        </ul>
        {!week && (
          <ul className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <li>{translate('howTo.colours')}</li>
            {LEGEND.map(([key, tone]) => (
              <li key={key} className="flex items-center gap-1.5">
                <span aria-hidden className={cn('size-2 rounded-full bg-current', tone)} />
                {translate(`legend.${key}`)}
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  )
}

// Figma «Saldo» → Calendar 51:125110 (desktop: weekday strip on subtle, the cells, the legend below; the grid has top /
// left hairlines, every cell right / bottom), the desktop week 59:128610 (seven tiles, gap 8, no strip) and 59:129461
// (phones, the week too: a card, padding 12, weekdays in caption, number and marks). Only the shown period is read:
// days of the neighbouring months stay empty.
export function CalendarMonth() {
  const { view, date } = useCalendarParams()
  const { entries, totals, marks } = useCalendarData()
  const week = view === 'week'
  const days = week ? weekDays(date) : monthGrid(date)
  const weekdays = useWeekdayNames(days)
  const byDay = groupByDay(entries.data ?? [])
  const totalsByDay = new Map((totals.data ?? []).map((row) => [row.day, row]))

  return (
    <div className="flex flex-col gap-4">
      <div
        className={cn(
          'flex flex-col gap-1 overflow-hidden rounded-card bg-card p-3 shadow-card lg:gap-0 lg:p-0',
          week
            ? 'lg:overflow-visible lg:rounded-none lg:bg-transparent lg:shadow-none'
            : 'lg:border-t lg:border-l lg:border-border',
        )}
      >
        <div
          aria-hidden
          className={cn(
            'grid grid-cols-7 pb-1 text-center text-caption text-text-tertiary lg:border-r lg:border-b lg:border-border lg:bg-subtle lg:py-2 lg:font-medium lg:text-text-secondary',
            week && 'lg:hidden',
          )}
        >
          {weekdays.map((name) => (
            <span key={name}>{name}</span>
          ))}
        </div>
        <div className={cn('grid grid-cols-7', week && 'lg:gap-2')}>
          {days.map((day, index) => {
            const inPeriod = week || day.slice(0, 7) === date.slice(0, 7)

            return (
              <DayCell
                key={day}
                day={day}
                muted={!week && (!inPeriod || index % 7 > 4)}
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
