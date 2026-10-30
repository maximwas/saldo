'use client'

import type { Route } from 'next'
import Link from 'next/link'
import { useFormatter, useTranslations } from 'next-intl'
import { parseAsString, useQueryStates } from 'nuqs'
import { Amount } from '@/components/ui/amount.component'
import { Badge } from '@/components/ui/badge.component'
import { Button } from '@/components/ui/button.component'
import { ServiceLogo } from '@/components/ui/service-logo.component'
import { useCanWrite } from '@/contexts/ledger.context'
import { cn } from '@/lib/utils/cn.utils'
import type { CalendarEntry } from '../api/calendar.api'
import { useCalendarParams } from '../hooks/calendar-params.hook'
import { dayDate, entryTone, signedMinor, sourceHref } from '../utils/calendar.utils'

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
  const href = sourceHref(entry.sourceType, entry.sourceId)
  // a debt's plan is paid by a repayment on the debt (add_debt_movement), never by «Paid»
  const payable = canWrite && entry.entry === 'plan' && OPEN_STATES.includes(entry.state) && entry.sourceType !== 'debt'
  const sourceKey = SOURCE_LINKS.includes(entry.sourceType ?? '') ? entry.sourceType : 'other'

  if (!payable && !href) {
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
