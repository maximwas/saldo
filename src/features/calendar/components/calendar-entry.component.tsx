'use client'

import type { Route } from 'next'
import Link from 'next/link'
import { useFormatter, useTranslations } from 'next-intl'
import { parseAsString, useQueryStates } from 'nuqs'
import { useState } from 'react'
import { Amount } from '@/components/ui/amount.component'
import { Badge } from '@/components/ui/badge.component'
import { Button } from '@/components/ui/button.component'
import { ServiceLogo } from '@/components/ui/service-logo.component'
import { useCanWrite } from '@/contexts/ledger.context'
import { cn } from '@/lib/utils/cn.utils'
import type { CalendarEntry } from '../api/calendar.api'
import { useCalendarParams } from '../hooks/calendar-params.hook'
import { dayDate, entryOutline, entryTone, signedMinor, sourceHref } from '../utils/calendar.utils'
import { RemoveEntryDialog } from './remove-entry-dialog.component'

const STATE_TONE = {
  fact: 'neutral',
  plan: 'plan',
  partial: 'info',
  unconfirmed: 'warning',
  paid: 'positive',
  cancelled: 'muted',
} as const

const OPEN_STATES = ['plan', 'partial', 'unconfirmed']
const SOURCE_LINKS = ['subscription', 'credit', 'debt']
const SERIES_SOURCES = ['credit', 'debt']

/** Figma CalendarEntry 2:10750: a 3×14 marker (a fact fills it, a plan outlines it) and the name; the amount is optional */
function EntryMarker({ entry }: { entry: CalendarEntry }) {
  return (
    <span
      aria-hidden
      className={cn(
        'h-3.5 w-0.75 shrink-0 rounded-full',
        entry.entry === 'plan' ? ['border', entryOutline(entry)] : entryTone(entry),
      )}
    />
  )
}

type EntryLineProps = {
  entry: CalendarEntry
  name: string
  /** shows the signed amount at the end of the line */
  withAmount?: boolean
}

export function EntryLine({ entry, name, withAmount = false }: EntryLineProps) {
  const plan = entry.entry === 'plan'

  return (
    <span className="flex min-w-0 items-center gap-1.5 text-caption">
      <EntryMarker entry={entry} />
      <span className={cn('min-w-0 flex-1 truncate text-left', plan ? 'text-text-secondary' : 'text-text-primary')}>
        {name}
      </span>
      {withAmount && (
        <Amount
          minor={signedMinor(entry)}
          currency={entry.currency}
          kind={plan ? 'plan' : 'fact'}
          className={cn('text-caption', plan && 'font-normal')}
        />
      )}
    </span>
  )
}

function amountKind(entry: CalendarEntry) {
  if (entry.entry === 'plan') {
    return 'plan'
  }

  if (entry.kind === 'transfer_out') {
    return 'transfer'
  }

  return entry.direction === 'in' ? 'income' : 'fact'
}

/** the obligation sheets of «Upcoming» live in the page: the calendar only puts their id into the URL */
const useObligationSheets = () =>
  useQueryStates({
    pay: parseAsString,
    move: parseAsString,
  })[1]

function EntryActions({ entry }: { entry: CalendarEntry }) {
  const translate = useTranslations('calendar')
  const canWrite = useCanWrite()
  const openSheet = useObligationSheets()
  const [removing, setRemoving] = useState(false)
  const href = sourceHref(entry.sourceType, entry.sourceId)
  // a debt's plan is paid by a repayment on the debt (add_debt_movement), never by «Paid»
  const payable = canWrite && entry.entry === 'plan' && OPEN_STATES.includes(entry.state) && entry.sourceType !== 'debt'
  // a plan with nothing paid and not a credit / debt installment (those leave through their own card)
  const removable =
    canWrite &&
    entry.entry === 'plan' &&
    entry.state === 'plan' &&
    !entry.paidMinor &&
    entry.obligationId !== null &&
    !SERIES_SOURCES.includes(entry.sourceType ?? '')
  const sourceKey = SOURCE_LINKS.includes(entry.sourceType ?? '') ? entry.sourceType : 'other'

  if (!payable && !href && !removable) {
    return null
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {payable && (
        <>
          <Button size="s" onClick={() => void openSheet({ pay: entry.obligationId })}>
            {translate('actions.pay')}
          </Button>
          <Button size="s" variant="secondary" onClick={() => void openSheet({ move: entry.obligationId })}>
            {translate('actions.move')}
          </Button>
        </>
      )}
      {removable && (
        <Button size="s" variant="ghost" onClick={() => setRemoving(true)}>
          {translate('actions.remove')}
        </Button>
      )}
      {removing && <RemoveEntryDialog entry={entry} onCloseAction={() => setRemoving(false)} />}
      {href && (
        <Link
          href={href as Route}
          className="rounded-xs px-3 py-2 text-label font-medium text-primary-text outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          {translate(`actions.source.${sourceKey as 'other'}`)}
        </Link>
      )}
    </div>
  )
}

function EntryDetails({ entry }: { entry: CalendarEntry }) {
  const translate = useTranslations('calendar')
  const format = useFormatter()
  const short = (day: string) =>
    format.dateTime(dayDate(day), {
      timeZone: 'UTC',
      day: '2-digit',
      month: '2-digit',
    })
  const movedFact = entry.entry === 'fact' && entry.plannedOn !== null && entry.plannedOn !== entry.day
  const partly = entry.entry === 'plan' && (entry.paidMinor ?? 0) > 0

  return (
    <>
      {movedFact && entry.plannedOn && (
        <span className="text-caption text-text-secondary">
          {translate('day.plannedOn', { date: short(entry.plannedOn) })}
        </span>
      )}
      {partly && (
        <span className="flex flex-wrap items-center gap-1 text-caption text-text-secondary">
          {translate.rich('day.paidOf', {
            paid: () => <Amount minor={entry.paidMinor} currency={entry.currency} className="text-caption" />,
            planned: () => (
              <Amount minor={entry.plannedAmountMinor} currency={entry.currency} className="text-caption" />
            ),
          })}
        </span>
      )}
    </>
  )
}

// Figma «Saldo» → Calendar 2:66942 day panel row: logo, title, «Subscription · Plan» pill, amount; Paid / Change the
// date / To the subscription under a plan. A fact that paid a plan keeps the plan's date and sum in its details (§18).
export function CalendarEntryItem({ entry }: { entry: CalendarEntry }) {
  const translate = useTranslations('calendar')
  const { item, setUrl } = useCalendarParams()
  const label = entry.sourceType
    ? translate(`source.${entry.sourceType as 'manual'}`)
    : translate(`kind.${entry.kind as 'expense'}`)

  return (
    <li
      className={cn(
        'flex flex-col gap-3 rounded-inner border-b border-border pb-4 last:border-b-0 last:pb-0',
        item === entry.id && 'bg-primary-soft p-3 last:pb-3',
      )}
    >
      <button
        type="button"
        aria-pressed={item === entry.id}
        onClick={() => void setUrl({ item: item === entry.id ? null : entry.id })}
        className="flex items-start gap-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        {entry.sourceType === 'subscription' ? (
          <ServiceLogo name={entry.title ?? label} />
        ) : (
          <span aria-hidden className={cn('mt-1 h-8 w-1 shrink-0 rounded-full', entryTone(entry))} />
        )}
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="break-words text-body font-medium text-text-primary">{entry.title ?? label}</span>
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-caption text-text-secondary">
            {label}
            <Badge tone={STATE_TONE[entry.state as 'plan'] ?? 'neutral'}>
              {translate(`state.${entry.state as 'plan'}`)}
            </Badge>
          </span>
          <EntryDetails entry={entry} />
        </span>
        <Amount minor={signedMinor(entry)} currency={entry.currency} kind={amountKind(entry)} />
      </button>
      <EntryActions entry={entry} />
    </li>
  )
}
