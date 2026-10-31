'use client'

import { useLocale, useTranslations } from 'next-intl'
import { useState } from 'react'
import { Amount } from '@/components/ui/amount.component'
import { Badge } from '@/components/ui/badge.component'
import { Button } from '@/components/ui/button.component'
import { Card } from '@/components/ui/card.component'
import { useToday } from '@/contexts/clock.context'
import { useCanWrite } from '@/contexts/ledger.context'
import { cn } from '@/lib/utils/cn.utils'
import type { Credit, CreditInstallment, InstallmentState } from '../api/credits.api'
import { usePayInstallment } from '../hooks/credits.hook'
import { activeInstallments, creditProgress, dayText, moneyText } from '../utils/credits.utils'

type CreditScheduleProps = {
  credit: Credit
  className?: string
}

const STATE_TONE = {
  plan: 'plan',
  partial: 'info',
  unconfirmed: 'warning',
  paid: 'positive',
  replaced: 'muted',
  cancelled: 'muted',
} as const

type Note = 'paidBefore' | 'next' | 'last' | 'plan' | 'unconfirmed' | 'partial' | 'replaced' | 'cancelled' | null

const NOTE_BY_STATE: Record<InstallmentState, Note> = {
  plan: 'plan',
  partial: 'partial',
  unconfirmed: 'unconfirmed',
  paid: null,
  replaced: 'replaced',
  cancelled: 'cancelled',
}

function noteOf(installment: CreditInstallment, next: CreditInstallment | null, lastId: string | undefined): Note {
  if (installment.state === 'plan' && installment === next) {
    return 'next'
  }

  if (installment.state === 'plan' && installment.id === lastId) {
    return 'last'
  }

  return NOTE_BY_STATE[installment.state]
}

type ScheduleRowProps = {
  number: number
  title: string
  note: Note
  /** «Next · in 6 days» instead of the plain note */
  noteText?: string
  state: InstallmentState
  amountMinor: number | null
  currency: string
  /** mobile shows the first five rows until «N more» is pressed */
  collapsed?: boolean
  onPayAction?: () => void
}

// Figma «Saldo» → Credit card, Schedule rows 2:50083 (desktop: number, date + note, pill, sum 120, actions 150) and the
// mobile card 2:50764 (number, date with «· next» and the pill under it, sum)
function ScheduleRow({
  number,
  title,
  note,
  noteText,
  state,
  amountMinor,
  currency,
  collapsed,
  onPayAction,
}: ScheduleRowProps) {
  const translate = useTranslations('credits')
  const history = state === 'replaced' || state === 'cancelled'
  const unknownDate = note === 'paidBefore'
  const pill = <Badge tone={STATE_TONE[state]}>{translate(`state.${state}`)}</Badge>

  return (
    <li
      className={cn(
        'flex items-center gap-4 border-b border-border py-3 last:border-b-0',
        collapsed && 'max-lg:hidden',
      )}
    >
      <span className="w-6 shrink-0 text-label font-medium text-text-tertiary tabular-nums">{number}</span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5 max-lg:items-start">
        <span
          className={cn(
            'text-body font-medium',
            unknownDate ? 'text-text-secondary' : 'text-text-primary',
            history && 'text-text-tertiary line-through',
          )}
        >
          {title}
          {note === 'next' && <span className="lg:hidden"> · {translate('schedule.note.nextShort')}</span>}
        </span>
        <span className="lg:hidden">{pill}</span>
        {(noteText ?? note) && (
          <span className="text-label text-text-secondary max-lg:hidden">
            {noteText ?? translate(`schedule.note.${note as Exclude<Note, null>}`)}
          </span>
        )}
      </span>
      <span className="max-lg:hidden">{pill}</span>
      <span className="flex justify-end lg:w-30">
        <Amount
          minor={amountMinor}
          currency={currency}
          kind={state === 'paid' ? 'fact' : 'plan'}
          className={cn(history && 'text-text-tertiary')}
        />
      </span>
      <span className="flex w-37.5 justify-end max-lg:hidden">
        {onPayAction && (
          <Button size="s" onClick={onPayAction}>
            {translate('actions.paid')}
          </Button>
        )}
      </span>
    </li>
  )
}

const COLLAPSED_ROWS = 5

/** whole days from today to an ISO date; noon UTC, so no time zone moves the day */
const daysUntil = (iso: string, today: string) =>
  Math.round((Date.parse(`${iso}T12:00:00Z`) - Date.parse(`${today}T12:00:00Z`)) / 86_400_000)

// Figma «Saldo» → Credit card 2:49412, Instalment schedule: number, date and a note, the state pill, the amount, «Paid»
// on the next one. The installments paid before tracking have no rows in the database: «date unknown». Replaced and
// cancelled installments stay below their number as history (§9). Mobile (2:50764) folds the rows after the fifth
// into «N more · until date».
export function CreditSchedule({ credit, className }: CreditScheduleProps) {
  const translate = useTranslations('credits')
  const locale = useLocale()
  const today = useToday()
  const canWrite = useCanWrite()
  const pay = usePayInstallment()
  const [expanded, setExpanded] = useState(false)
  const next = creditProgress(credit).next
  const lastId = activeInstallments(credit).at(-1)?.id
  const payable = canWrite && credit.status === 'active'
  const before = Array.from({ length: credit.paidBeforeTrackingCount }, (_, index) => index + 1)
  const total = before.length + credit.installments.length
  const hidden = expanded ? 0 : Math.max(total - COLLAPSED_ROWS, 0)
  const lastDue = credit.installments.at(-1)?.dueOn
  const amountOf = credit.totalPayableMinor ?? credit.purchasePriceMinor
  const money = amountOf === null ? '' : moneyText(amountOf, credit.currency, locale).replace(/[,.]00(?!\d)/, '')

  return (
    <Card title={translate('schedule.title')} className={className}>
      <ul aria-label={translate('schedule.title')} className="flex flex-col gap-4">
        {before.map((number, index) => (
          <ScheduleRow
            key={`before-${number}`}
            number={number}
            title={translate('schedule.unknownDate')}
            note="paidBefore"
            state="paid"
            amountMinor={credit.regularInstallmentMinor}
            currency={credit.currency}
            collapsed={index >= COLLAPSED_ROWS && !expanded}
          />
        ))}
        {credit.installments.map((installment, index) => {
          const note = noteOf(installment, next, lastId)

          return (
            <ScheduleRow
              key={installment.id}
              number={installment.sequenceNo}
              title={dayText(installment.dueOn, locale, true)}
              note={note}
              noteText={
                note === 'next'
                  ? translate('schedule.note.nextIn', { days: daysUntil(installment.dueOn, today) })
                  : undefined
              }
              state={installment.state}
              amountMinor={installment.plannedMinor}
              currency={credit.currency}
              collapsed={before.length + index >= COLLAPSED_ROWS && !expanded}
              onPayAction={payable && installment === next ? () => pay(installment.id) : undefined}
            />
          )
        })}
      </ul>
      {total > COLLAPSED_ROWS && (
        <button
          type="button"
          onClick={() => setExpanded((open) => !open)}
          className="cursor-pointer rounded-xs text-center text-label font-medium text-primary-text outline-none focus-visible:ring-2 focus-visible:ring-primary lg:hidden"
        >
          {expanded || !lastDue
            ? translate('schedule.less')
            : translate('schedule.more', {
                count: hidden,
                date: dayText(lastDue, locale, true),
              })}
        </button>
      )}
      <div className="flex flex-col gap-1 text-caption text-text-tertiary">
        {credit.scheduleAccuracy === 'estimated' && (
          <p>
            <span className="max-lg:hidden">
              {translate('schedule.estimated', {
                amount: money,
                count: credit.installmentsCount,
              })}
            </span>
            <span className="lg:hidden">{translate('schedule.estimatedShort')}</span>
            {credit.paidBeforeTrackingCount > 0 && (
              <>
                {' '}
                <span className="max-lg:hidden">
                  {translate('schedule.paidBefore', { count: credit.paidBeforeTrackingCount })}
                </span>
                <span className="lg:hidden">
                  {translate('schedule.paidBeforeShort', { count: credit.paidBeforeTrackingCount })}
                </span>
              </>
            )}
          </p>
        )}
      </div>
    </Card>
  )
}
