'use client'

import { useFormatter, useTranslations } from 'next-intl'
import { Amount } from '@/components/ui/amount.component'
import { useLedger } from '@/contexts/ledger.context'
import { cn } from '@/lib/utils/cn.utils'
import type { CalendarEntry } from '../api/calendar.api'
import { useCalendarData } from '../hooks/calendar.hook'
import { useCalendarParams } from '../hooks/calendar-params.hook'
import {
  capitalize,
  type DayTotals,
  dayDate,
  entryTone,
  groupByDay,
  signedMinor,
  weekDays,
} from '../utils/calendar.utils'

type DaySectionProps = {
  day: string
  entries: CalendarEntry[]
  totals: DayTotals | undefined
}

/** «Fact −924,70 ₴ · Plan −199,00 ₴» on the right of a day; a day without entries says so */
function DaySums({ entries, totals }: Omit<DaySectionProps, 'day'>) {
  const translate = useTranslations('calendar')
  const { baseCurrency } = useLedger()
  const hasFact = entries.some((entry) => entry.entry === 'fact')
  const hasPlan = entries.some((entry) => entry.entry === 'plan')

  if (!totals) {
    return <span className="text-caption text-text-tertiary">{translate('day.noEntries')}</span>
  }

  return (
    <span className="flex flex-col items-end text-caption text-text-secondary">
      {hasPlan && (
        <span>
          {translate.rich('day.planSum', {
            amount: () => (
              <Amount
                minor={totals.planInMinor - totals.planOutMinor}
                currency={baseCurrency}
                kind="plan"
                className="text-caption"
              />
            ),
          })}
        </span>
      )}
      {hasFact && (
        <span>
          {translate.rich('day.factSum', {
            amount: () => (
              <Amount
                minor={totals.factIncomeMinor - totals.factExpenseMinor}
                currency={baseCurrency}
                className="text-caption"
              />
            ),
          })}
        </span>
      )}
    </span>
  )
}

function DaySection({ day, entries, totals }: DaySectionProps) {
  const translate = useTranslations('calendar')
  const format = useFormatter()
  const { today, setUrl } = useCalendarParams()
  const label = capitalize(
    format.dateTime(dayDate(day), {
      timeZone: 'UTC',
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    }),
  )
  const open = (item: string | null) =>
    void setUrl({
      view: 'day',
      date: day,
      item,
    })

  return (
    <li data-day={day} className="flex flex-col gap-2 border-b border-border py-4 first:pt-0 last:border-b-0 last:pb-0">
      <button
        type="button"
        onClick={() => open(null)}
        className="flex items-start justify-between gap-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <span className={cn('text-label font-medium', day === today ? 'text-primary-text' : 'text-text-primary')}>
          {label}
        </span>
        <DaySums entries={entries} totals={totals} />
      </button>
      {entries.length > 0 && (
        <ul className="flex flex-col gap-1">
          {entries.map((entry) => (
            <li key={entry.id}>
              <button
                type="button"
                onClick={() => open(entry.id)}
                className="flex w-full items-center gap-2 text-left text-caption text-text-secondary outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <span aria-hidden className={cn('h-3 w-0.5 shrink-0 rounded-full', entryTone(entry))} />
                <span className="min-w-0 flex-1 truncate">
                  {entry.title}
                  {' · '}
                  {entry.sourceType
                    ? translate(`source.${entry.sourceType as 'manual'}`)
                    : translate(`kind.${entry.kind as 'expense'}`)}
                </span>
                <Amount
                  minor={signedMinor(entry)}
                  currency={entry.currency}
                  kind={entry.entry === 'plan' ? 'plan' : 'fact'}
                  className="text-caption"
                />
              </button>
            </li>
          ))}
        </ul>
      )}
    </li>
  )
}

// Figma «Saldo» → Calendar · List 2:71087: one card, days newest first with their fact / plan sums, entries as «title ·
// type» rows. Week (no frame) is the same card over Monday to Sunday, oldest first, days without entries included.
// A day or an entry opens the day view with the filters kept.
export function CalendarDays() {
  const translate = useTranslations('calendar')
  const format = useFormatter()
  const { view, date } = useCalendarParams()
  const { entries, totals } = useCalendarData()
  const byDay = groupByDay(entries.data ?? [])
  const totalsByDay = new Map((totals.data ?? []).map((row) => [row.day, row]))
  const days = view === 'week' ? weekDays(date) : [...byDay.keys()].reverse()
  const month = capitalize(
    format.dateTime(dayDate(date), {
      timeZone: 'UTC',
      month: 'long',
    }),
  )

  return (
    <section className="flex flex-col gap-4 rounded-card bg-card p-5 shadow-card lg:p-6">
      {view === 'list' && (
        <h2 className="text-card-title text-text-primary">{translate('listTitle', { period: month })}</h2>
      )}
      <ol className="flex flex-col">
        {days.map((day) => (
          <DaySection key={day} day={day} entries={byDay.get(day) ?? []} totals={totalsByDay.get(day)} />
        ))}
      </ol>
    </section>
  )
}
