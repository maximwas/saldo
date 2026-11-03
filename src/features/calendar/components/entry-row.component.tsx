'use client'

import { CalendarClock, CircleCheck, type LucideIcon } from 'lucide-react'
import { Amount } from '@/components/ui/amount.component'
import { CategoryIcon } from '@/components/ui/category-icon.component'
import { ServiceLogo } from '@/components/ui/service-logo.component'
import { cn } from '@/lib/utils/cn.utils'
import type { CalendarEntry } from '../api/calendar.api'
import { useCalendarOptions } from '../hooks/calendar.hook'
import { useEntryLine, useEntryType } from '../hooks/entry-labels.hook'
import { type EntryStatus, entryStatus, signedMinor } from '../utils/calendar.utils'
import { EntryTrigger } from './entry-trigger.component'

/** the 16 icon before a status: a check once paid, a calendar clock while a plan waits, none for a plain operation */
export const STATUS_ICON: Record<EntryStatus, LucideIcon | null> = {
  planned: CalendarClock,
  partial: CalendarClock,
  overdue: CalendarClock,
  paid: CircleCheck,
  paidElsewhere: CircleCheck,
  fact: null,
}

/** a plan in the plan colour, a transfer muted, income green, everything else a fact */
export function amountKind(entry: CalendarEntry) {
  if (entry.entry === 'plan') {
    return 'plan'
  }

  if (entry.kind === 'transfer_out') {
    return 'transfer'
  }

  return entry.direction === 'in' ? 'income' : 'fact'
}

/** a subscription's logo, else its category tile (Figma CategoryIcon 40); no category shows the tag on the primary
 * (blue) tile, since grey means «paid earlier» in the calendar */
export function EntryTile({ entry }: { entry: CalendarEntry }) {
  const type = useEntryType()
  const category = useCalendarOptions().data?.categories.find((item) => item.id === entry.categoryId)

  if (entry.sourceType === 'subscription') {
    return <ServiceLogo name={entry.title ?? type(entry)} />
  }

  return <CategoryIcon icon={category?.icon ?? null} color={category?.color ?? 'blue'} />
}

type EntryRowProps = {
  entry: CalendarEntry
  /** the plan day's greyed mark of a plan paid on another day (Figma 55:127515): its money counts on the pay day */
  mark?: boolean
}

// Figma «Saldo» → Day card rows 57:128510: the 40 tile at the top (conventions §4.6c), the name and the amount (Amount
// fact or plan) on the first line, a 16 icon and «type · status» under them; the whole row opens the entry's popup.
// The one row of the day view, the month's side card and the list.
export function EntryRow({ entry, mark = false }: EntryRowProps) {
  const line = useEntryLine()
  const type = useEntryType()
  const StatusIcon = mark ? CircleCheck : STATUS_ICON[entryStatus(entry)]

  return (
    <li className="-mx-3">
      <EntryTrigger entry={entry} className="flex w-full items-start gap-3 rounded-md p-3">
        <EntryTile entry={entry} />
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="flex items-baseline gap-2">
            <span
              className={cn(
                'min-w-0 flex-1 break-words text-label font-medium',
                mark ? 'text-text-tertiary' : 'text-text-primary',
              )}
            >
              {entry.title ?? type(entry)}
            </span>
            <Amount
              minor={signedMinor(entry)}
              currency={entry.currency}
              kind={amountKind(entry)}
              className={cn(mark && 'text-text-tertiary')}
            />
          </span>
          <span className="flex items-start gap-1.5 text-caption text-text-tertiary">
            {StatusIcon ? <StatusIcon aria-hidden className="mt-px size-4 shrink-0" /> : null}
            {line(entry, mark)}
          </span>
        </span>
      </EntryTrigger>
    </li>
  )
}
