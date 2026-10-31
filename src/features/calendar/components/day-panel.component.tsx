'use client'

import { Calendar, Plus } from 'lucide-react'
import { useFormatter, useTranslations } from 'next-intl'
import { parseAsString, useQueryStates } from 'nuqs'
import { Amount } from '@/components/ui/amount.component'
import { Button } from '@/components/ui/button.component'
import { useCanWrite, useLedger } from '@/contexts/ledger.context'
import { cn } from '@/lib/utils/cn.utils'
import { useCalendarData } from '../hooks/calendar.hook'
import { useCalendarParams } from '../hooks/calendar-params.hook'
import { capitalize, dayDate } from '../utils/calendar.utils'
import { CalendarEntryItem, EntryLine } from './calendar-entry.component'

type DayPanelProps = {
  /** the month's side card: short rows that open the day view; the day view itself lists every entry with its actions */
  compact?: boolean
}

// Figma «Saldo» → Calendar 2:66942 / 2:75069 right card (320, padding 24, gap 20) and 2:69624 / 2:78218 card under the
// grid: the day (with the number of entries), fact and plan sums, the entries (a row each: marker, name, amount; an
// open one in the day view with Paid / Change the date / Remove), «Tap an entry…» and «Add an entry on 31.10». The
// add button opens the global operation sheet (?add=) on this date (?on=). An empty day: sums on desktop, an empty state on phones.
export function DayPanel({ compact = false }: DayPanelProps) {
  const translate = useTranslations('calendar')
  const format = useFormatter()
  const { baseCurrency } = useLedger()
  const canWrite = useCanWrite()
  const { date, setUrl } = useCalendarParams()
  const { entries, totals } = useCalendarData()
  const [, openAdd] = useQueryStates({
    add: parseAsString,
    on: parseAsString,
  })
  const dayEntries = (entries.data ?? []).filter((entry) => entry.day === date)
  const day = totals.data?.find((row) => row.day === date)
  const hasPlan = dayEntries.some((entry) => entry.entry === 'plan')
  const hasFact = dayEntries.some((entry) => entry.entry === 'fact')
  const empty = dayEntries.length === 0
  const heading = capitalize(
    format.dateTime(dayDate(date), {
      timeZone: 'UTC',
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    }),
  )
  const title = empty
    ? heading
    : translate('day.title', {
        date: heading,
        count: translate('summary.count', { count: dayEntries.length }),
      })

  return (
    <section aria-label={heading} className="flex flex-col gap-5 rounded-card bg-card p-6 shadow-card">
      <h2 className="text-card-title text-text-primary">{title}</h2>
      <div className="flex flex-col gap-4">
        <dl className={cn('gap-3 border-b border-border pb-4', empty ? 'hidden lg:flex' : 'flex')}>
          <div className="flex flex-1 flex-col gap-0.5">
            <dt className="text-caption text-text-tertiary">{translate('day.fact')}</dt>
            <dd className="text-label font-medium text-text-primary">
              {hasFact && day ? (
                <Amount
                  minor={day.factIncomeMinor - day.factExpenseMinor}
                  currency={baseCurrency}
                  className="text-label"
                />
              ) : (
                <span className="text-text-secondary">{translate('day.noEntries')}</span>
              )}
            </dd>
          </div>
          {(hasPlan || empty) && (
            <div className="flex flex-1 flex-col items-end gap-0.5">
              <dt className="text-caption text-text-tertiary">{translate('day.plan')}</dt>
              <dd>
                {hasPlan && day ? (
                  <Amount minor={day.planInMinor - day.planOutMinor} currency={baseCurrency} kind="plan" />
                ) : (
                  <span className="text-body font-medium text-text-secondary">—</span>
                )}
              </dd>
            </div>
          )}
        </dl>
        {empty && (
          <div className="flex flex-col items-center gap-3 p-2 text-center lg:hidden">
            <span
              aria-hidden
              className="flex size-10 items-center justify-center rounded-full bg-cat-blue-soft text-cat-blue-text"
            >
              <Calendar size={20} />
            </span>
            <p className="self-stretch text-body font-semibold text-text-primary">{translate('day.emptyTitle')}</p>
            <p className="self-stretch text-label text-text-secondary">{translate('day.emptyText')}</p>
          </div>
        )}
        {!empty && compact && (
          <ul className="flex flex-col gap-2 border-b border-border pb-4">
            {dayEntries.map((entry) => (
              <li key={entry.id}>
                <button
                  type="button"
                  onClick={() =>
                    void setUrl({
                      view: 'day',
                      item: entry.id,
                    })
                  }
                  className="block w-full rounded-xs outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <EntryLine entry={entry} name={entry.title ?? ''} withAmount />
                </button>
              </li>
            ))}
          </ul>
        )}
        {!empty && !compact && (
          <ul className="flex flex-col gap-4">
            {dayEntries.map((entry) => (
              <CalendarEntryItem key={entry.id} entry={entry} />
            ))}
          </ul>
        )}
        {!empty && compact && <p className="text-caption text-text-tertiary">{translate('day.openHint')}</p>}
        {!empty && !compact && hasPlan && (
          <p className="border-t border-border pt-4 text-caption text-text-secondary">{translate('day.hint')}</p>
        )}
        {canWrite && (
          <Button
            variant="secondary"
            className="whitespace-normal"
            onClick={() =>
              void openAdd({
                add: 'expense',
                on: date,
              })
            }
          >
            <Plus aria-hidden size={20} className="shrink-0" />
            {translate('day.add', {
              date: format.dateTime(dayDate(date), {
                timeZone: 'UTC',
                day: '2-digit',
                month: '2-digit',
              }),
            })}
          </Button>
        )}
      </div>
    </section>
  )
}
