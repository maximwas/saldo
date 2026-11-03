'use client'

import { useTranslations } from 'next-intl'
import { useCanWrite } from '@/contexts/ledger.context'
import { useCalendarData } from '../hooks/calendar.hook'
import { useCalendarParams } from '../hooks/calendar-params.hook'
import { useDayTitle, useMonthOf, useShortDate } from '../hooks/entry-labels.hook'
import { groupByDay } from '../utils/calendar.utils'
import { DaySums } from './day-sums.component'
import { EntryRow } from './entry-row.component'

// Figma «Saldo» → Calendar · List 59:128733: one card «All entries of November», a block per day with entries (in date
// order) with the day's title and its labelled sums, or «Paid 03.11» when its plans were all paid on another day, then
// the same rows as the day view, those marks included, and «Tap an entry…». Every row opens the entry's popup.
export function CalendarDays() {
  const translate = useTranslations('calendar')
  const canWrite = useCanWrite()
  const dayTitle = useDayTitle()
  const monthOf = useMonthOf()
  const short = useShortDate()
  const { date } = useCalendarParams()
  const { entries, totals, marks } = useCalendarData()
  const byDay = groupByDay(entries.data ?? [])
  const totalsByDay = new Map((totals.data ?? []).map((row) => [row.day, row]))
  const days = [...new Set([...byDay.keys(), ...marks.keys()])].sort()
  const paidOn = (day: string) => [...new Set((marks.get(day) ?? []).map((entry) => short(entry.day)))].join(', ')

  return (
    <section className="flex flex-col gap-5 rounded-card bg-card p-6 shadow-card">
      <h2 className="text-card-title text-text-primary">{translate('listTitle', { month: monthOf(date) })}</h2>
      <ol className="flex flex-col divide-y divide-border">
        {days.map((day) => (
          <li key={day} data-day={day} className="flex flex-col gap-1 py-4 first:pt-0 last:pb-0">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <h3 className="text-label font-semibold text-text-primary">{dayTitle(day)}</h3>
              {byDay.has(day) ? (
                <DaySums totals={totalsByDay.get(day)} layout="inline" />
              ) : (
                <span className="text-caption text-text-tertiary">{translate('paidOn', { date: paidOn(day) })}</span>
              )}
            </div>
            <ul className="flex flex-col">
              {(byDay.get(day) ?? []).map((entry) => (
                <EntryRow key={entry.id} entry={entry} />
              ))}
              {(marks.get(day) ?? []).map((entry) => (
                <EntryRow key={`mark-${entry.id}`} entry={entry} mark />
              ))}
            </ul>
          </li>
        ))}
      </ol>
      {canWrite && <p className="text-caption text-text-tertiary">{translate('day.hint')}</p>}
    </section>
  )
}
