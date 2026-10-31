'use client'

import { useFormatter, useTranslations } from 'next-intl'
import { Amount } from '@/components/ui/amount.component'
import { useLedger } from '@/contexts/ledger.context'
import type { CalendarEntry } from '../api/calendar.api'
import { useCalendarData, useCalendarOptions } from '../hooks/calendar.hook'
import { useCalendarParams } from '../hooks/calendar-params.hook'
import { capitalize, type DayTotals, dayDate, groupByDay, weekDays } from '../utils/calendar.utils'
import { EntryLine } from './calendar-entry.component'

type DaySectionProps = {
  day: string
  entries: CalendarEntry[]
  totals: DayTotals | undefined
}

/** «Fact −924,70 ₴», «Plan −199,00 ₴» or «No expenses» on the right of a day; a day without entries says so (Figma 2:72249) */
function DaySums({ entries, totals }: Omit<DaySectionProps, 'day'>) {
  const translate = useTranslations('calendar')
  const { baseCurrency } = useLedger()
  const hasFact = entries.some((entry) => entry.entry === 'fact')
  const hasPlan = entries.some((entry) => entry.entry === 'plan')

  if (!totals) {
    return <span className="text-caption text-text-secondary">{translate('day.noEntries')}</span>
  }

  const amount = (minor: number) => () => (
    <Amount minor={minor} currency={baseCurrency} kind="plan" className="text-caption font-normal" />
  )
  const factMinor = totals.factIncomeMinor - totals.factExpenseMinor

  return (
    <span className="flex flex-wrap items-center justify-end gap-x-2 text-caption text-text-secondary">
      {hasFact &&
        (factMinor === 0 ? (
          <span>{translate('day.noExpenses')}</span>
        ) : (
          <span>{translate.rich('day.factSum', { amount: amount(factMinor) })}</span>
        ))}
      {hasPlan && (
        <span>{translate.rich('day.planSum', { amount: amount(totals.planInMinor - totals.planOutMinor) })}</span>
      )}
    </span>
  )
}

function DaySection({ day, entries, totals }: DaySectionProps) {
  const translate = useTranslations('calendar')
  const format = useFormatter()
  const { today, setUrl } = useCalendarParams()
  const accounts = useCalendarOptions().data?.accounts
  const label =
    day === today
      ? translate('day.today', {
          weekday: format.dateTime(dayDate(day), {
            timeZone: 'UTC',
            weekday: 'long',
          }),
          date: format.dateTime(dayDate(day), {
            timeZone: 'UTC',
            day: 'numeric',
            month: 'long',
          }),
        })
      : capitalize(
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
  const typeOf = (entry: CalendarEntry) => {
    if (entry.sourceType) {
      return translate(`source.${entry.sourceType as 'manual'}`)
    }

    return entry.kind === 'expense' || entry.kind === 'income'
      ? null
      : translate(`kind.${entry.kind as 'transfer_out'}`)
  }
  // «Megogo · subscription · Main card»: the name, what it is (a source or a kind other than a plain expense) and the account
  const nameOf = (entry: CalendarEntry) =>
    [entry.title, typeOf(entry), accounts?.find((account) => account.id === entry.accountId)?.name]
      .filter(Boolean)
      .join(' · ')

  return (
    <li data-day={day} className="flex flex-col gap-2 border-b border-border py-3 last:border-b-0">
      <button
        type="button"
        onClick={() => open(null)}
        className="flex items-center gap-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <span className="flex-1 text-label font-semibold text-text-primary">{label}</span>
        <DaySums entries={entries} totals={totals} />
      </button>
      {entries.map((entry) => (
        <button
          key={entry.id}
          type="button"
          onClick={() => open(entry.id)}
          className="block w-full rounded-xs outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <EntryLine entry={entry} name={nameOf(entry)} withAmount />
        </button>
      ))}
    </li>
  )
}

// Figma «Saldo» → Calendar · List 2:71087: one card (padding 24, gap 20) titled «October · newest first»; a day is a
// 12-padded block with a hairline (label-semibold, the fact / plan line on the right, then entry lines as «title · type ·
// account» with the amount). Week (no frame) is the same card over Monday to Sunday, oldest first, days without entries
// included. A day or an entry opens the day view with the filters kept.
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
    <section className="flex flex-col gap-5 rounded-card bg-card p-6 shadow-card">
      {view === 'list' && (
        <h2 className="text-card-title text-text-primary">{translate('listTitle', { period: month })}</h2>
      )}
      <ol className="flex flex-col gap-4">
        {days.map((day) => (
          <DaySection key={day} day={day} entries={byDay.get(day) ?? []} totals={totalsByDay.get(day)} />
        ))}
      </ol>
    </section>
  )
}
