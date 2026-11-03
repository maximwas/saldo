'use client'

import { useFormatter, useTranslations } from 'next-intl'
import { useCalendarData } from '../hooks/calendar.hook'
import { useCalendarParams } from '../hooks/calendar-params.hook'
import { useDayTitle } from '../hooks/entry-labels.hook'
import { capitalize, dayDate, groupByDay, paidMarks } from '../utils/calendar.utils'
import { DaySums } from './day-sums.component'
import { EntryRow } from './entry-row.component'

// Figma «Saldo» → Calendar · List: one card titled «November · newest first», a block per day (newest first) with the
// day's title and its labelled sums, then the same rows as the day view, the marks of plans paid on another day
// included. Every row opens the entry's popup.
export function CalendarDays() {
  const translate = useTranslations('calendar')
  const format = useFormatter()
  const dayTitle = useDayTitle()
  const { date } = useCalendarParams()
  const { params, entries, totals } = useCalendarData()
  const all = entries.data ?? []
  const byDay = groupByDay(all)
  const marks = paidMarks(all)
  const totalsByDay = new Map((totals.data ?? []).map((row) => [row.day, row]))
  // a plan of another month paid in this one leaves its mark on that month, not here
  const days = [...new Set([...byDay.keys(), ...marks.keys()])]
    .filter((day) => day >= params.from && day <= params.to)
    .sort()
    .reverse()
  const month = capitalize(
    format.dateTime(dayDate(date), {
      timeZone: 'UTC',
      month: 'long',
    }),
  )

  return (
    <section className="flex flex-col gap-5 rounded-card bg-card p-6 shadow-card">
      <h2 className="text-card-title text-text-primary">{translate('listTitle', { period: month })}</h2>
      <ol className="flex flex-col divide-y divide-border">
        {days.map((day) => (
          <li key={day} data-day={day} className="flex flex-col gap-1 py-4 first:pt-0 last:pb-0">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <h3 className="text-label font-semibold text-text-primary">{dayTitle(day)}</h3>
              <DaySums totals={totalsByDay.get(day)} layout="inline" />
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
    </section>
  )
}
