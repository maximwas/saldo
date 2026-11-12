'use client'

import { Plus } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { parseAsString, useQueryStates } from 'nuqs'
import { Button } from '@/components/ui/button.component'
import { useCanWrite } from '@/contexts/ledger.context'
import { useDayText } from '@/lib/dates/day-text.hook'
import { cn } from '@/lib/utils/cn.utils'
import { useCalendarData } from '../hooks/calendar.hook'
import { useCalendarParams } from '../hooks/calendar-params.hook'
import { useDayTitle } from '../hooks/entry-labels.hook'
import { DaySums } from './day-sums.component'
import { QUIET_TAP } from './entry-popup.component'
import { EntryRow } from './entry-row.component'

type DayPanelProps = {
  /** the month's side card: the add button spans the card */
  compact?: boolean
}

// Figma «Saldo» → Day card 57:128482 (the day view) and the month's side card 51:125189: «Today, Tuesday 3 November»,
// the day's labelled sums, then «Already happened», «Planned» and «Paid on another day» without sums, a row per entry
// that opens its popup, «Tap an entry…» and «Add an entry on 03.11» (Secondary M; across the side card on desktop). The
// add button opens the global operation sheet (?add=) on this date (?on=). An empty day (57:128593, 59:129824) says so
// and offers a quiet Ghost S add.
export function DayPanel({ compact = false }: DayPanelProps) {
  const translate = useTranslations('calendar')
  const canWrite = useCanWrite()
  const dayTitle = useDayTitle()
  const dayText = useDayText()
  const { date } = useCalendarParams()
  const { entries, totals, marks } = useCalendarData()
  const [, openAdd] = useQueryStates({
    add: parseAsString,
    on: parseAsString,
  })
  const dayEntries = (entries.data ?? []).filter((entry) => entry.day === date)
  const plans = dayEntries.filter((entry) => entry.entry === 'plan')
  const groups = [
    ['done', dayEntries.filter((entry) => entry.entry === 'fact')],
    ['planned', plans],
    ['paidElsewhere', marks.get(date) ?? []],
  ] as const
  const empty = groups.every(([, rows]) => rows.length === 0)
  const title = dayTitle(date)

  return (
    <section aria-label={title} className="flex flex-col gap-5 rounded-card bg-card p-6 shadow-card">
      <h2 className="text-card-title text-text-primary">{title}</h2>
      {empty ? (
        <p className="text-label text-text-secondary">{translate('day.empty')}</p>
      ) : (
        <div className="flex flex-col gap-4">
          <DaySums
            totals={totals.data?.find((row) => row.day === date)}
            layout="panel"
            className="border-b border-border pb-4"
          />
          <div className="flex flex-col divide-y divide-border">
            {groups.map(
              ([key, rows]) =>
                rows.length > 0 && (
                  <section key={key} className="flex flex-col gap-1 py-4 first:pt-0 last:pb-0">
                    <h3 className="text-label font-medium text-text-secondary">{translate(`day.groups.${key}`)}</h3>
                    <ul className="flex flex-col">
                      {rows.map((entry) => (
                        <EntryRow key={entry.id} entry={entry} mark={key === 'paidElsewhere'} />
                      ))}
                    </ul>
                  </section>
                ),
            )}
          </div>
          {canWrite && plans.length > 0 && <p className="text-caption text-text-tertiary">{translate('day.hint')}</p>}
        </div>
      )}
      {canWrite && (
        <Button
          variant={empty ? 'ghost' : 'secondary'}
          size={empty ? 's' : 'm'}
          className={cn('self-start whitespace-normal', empty ? QUIET_TAP : compact && 'lg:self-stretch')}
          onClick={() =>
            void openAdd({
              add: 'expense',
              on: date,
            })
          }
        >
          <Plus aria-hidden className={cn('shrink-0', empty ? 'size-4' : 'size-5')} />
          {translate('day.add', { date: dayText(date, 'short') })}
        </Button>
      )}
    </section>
  )
}
