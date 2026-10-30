'use client'

import { Plus } from 'lucide-react'
import { useFormatter, useTranslations } from 'next-intl'
import { parseAsString, useQueryStates } from 'nuqs'
import { Amount } from '@/components/ui/amount.component'
import { Button } from '@/components/ui/button.component'
import { useCanWrite, useLedger } from '@/contexts/ledger.context'
import { useCalendarData } from '../hooks/calendar.hook'
import { useCalendarParams } from '../hooks/calendar-params.hook'
import { capitalize, dayDate } from '../utils/calendar.utils'
import { CalendarEntryItem } from './calendar-entry.component'

// Figma «Saldo» → Calendar 2:66942 right panel / 2:69624 card under the grid: the day, its fact and plan sums, every
// entry with its actions, the «the calendar does not confirm a payment» note and «Add an entry on 31.10». The add
// button opens the global operation sheet (?add=) on this date (?on=).
export function DayPanel() {
  const translate = useTranslations('calendar')
  const format = useFormatter()
  const { baseCurrency } = useLedger()
  const canWrite = useCanWrite()
  const { date } = useCalendarParams()
  const { entries, totals } = useCalendarData()
  const [, openAdd] = useQueryStates({
    add: parseAsString,
    on: parseAsString,
  })
  const dayEntries = (entries.data ?? []).filter((entry) => entry.day === date)
  const day = totals.data?.find((row) => row.day === date)
  const hasPlan = dayEntries.some((entry) => entry.entry === 'plan')
  const hasFact = dayEntries.some((entry) => entry.entry === 'fact')
  const title = capitalize(
    format.dateTime(dayDate(date), {
      timeZone: 'UTC',
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    }),
  )

  return (
    <section aria-label={title} className="flex flex-col gap-4 rounded-card bg-card p-5 shadow-card lg:p-6">
      <h2 className="text-card-title text-text-primary">{title}</h2>
      <dl className="flex items-start justify-between gap-3 border-b border-border pb-4">
        <div className="flex flex-col gap-0.5">
          <dt className="text-caption text-text-secondary">{translate('day.fact')}</dt>
          <dd className="text-label text-text-primary">
            {hasFact && day ? (
              <Amount minor={day.factIncomeMinor - day.factExpenseMinor} currency={baseCurrency} />
            ) : (
              translate('day.noEntries')
            )}
          </dd>
        </div>
        {hasPlan && day && (
          <div className="flex flex-col items-end gap-0.5">
            <dt className="text-caption text-text-secondary">{translate('day.plan')}</dt>
            <dd>
              <Amount minor={day.planInMinor - day.planOutMinor} currency={baseCurrency} kind="plan" />
            </dd>
          </div>
        )}
      </dl>
      {dayEntries.length > 0 && (
        <ul className="flex flex-col gap-4">
          {dayEntries.map((entry) => (
            <CalendarEntryItem key={entry.id} entry={entry} />
          ))}
        </ul>
      )}
      {hasPlan && (
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
    </section>
  )
}
