'use client'

import { useLocale, useTranslations } from 'next-intl'
import { useId } from 'react'
import { Amount } from '@/components/ui/amount.component'
import { Badge } from '@/components/ui/badge.component'
import { Button } from '@/components/ui/button.component'
import { useCanWrite } from '@/contexts/ledger.context'
import { cn } from '@/lib/utils/cn.utils'
import type { Credit, CreditInstallment, InstallmentState } from '../api/credits.api'
import { usePayInstallment } from '../hooks/credits.hook'
import { activeInstallments, creditProgress, dayText } from '../utils/credits.utils'

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
  state: InstallmentState
  amountMinor: number | null
  currency: string
  onPayAction?: () => void
}

function ScheduleRow({ number, title, note, state, amountMinor, currency, onPayAction }: ScheduleRowProps) {
  const translate = useTranslations('credits')
  const history = state === 'replaced' || state === 'cancelled'

  return (
    <li className="flex items-center gap-3 border-b border-border py-3 last:border-b-0 lg:gap-4">
      <span className="w-6 shrink-0 text-caption text-text-secondary tabular-nums">{number}</span>
      <span className="flex min-w-0 flex-1 flex-col gap-1 lg:flex-row lg:items-center lg:gap-4">
        <span className="flex min-w-0 flex-1 flex-col">
          <span className={cn('text-body font-medium text-text-primary', history && 'text-text-tertiary line-through')}>
            {title}
          </span>
          {note && <span className="text-caption text-text-secondary">{translate(`schedule.note.${note}`)}</span>}
        </span>
        <Badge tone={STATE_TONE[state]}>{translate(`state.${state}`)}</Badge>
      </span>
      <Amount
        minor={amountMinor}
        currency={currency}
        className={cn('w-28 text-right', history && 'text-text-tertiary')}
      />
      <span className="hidden w-28 justify-end sm:flex">
        {onPayAction && (
          <Button size="s" onClick={onPayAction}>
            {translate('actions.paid')}
          </Button>
        )}
      </span>
    </li>
  )
}

// Figma «Saldo» → Credit card 2:49412, Instalment schedule: number, date and a note, the state pill, the amount, «Paid»
// on the next one. The installments paid before tracking have no rows in the database: «date unknown». Replaced and
// cancelled installments stay below their number as history (§9).
export function CreditSchedule({ credit, className }: CreditScheduleProps) {
  const translate = useTranslations('credits')
  const locale = useLocale()
  const canWrite = useCanWrite()
  const pay = usePayInstallment()
  const titleId = useId()
  const next = creditProgress(credit).next
  const lastId = activeInstallments(credit).at(-1)?.id
  const payable = canWrite && credit.status === 'active'
  const before = Array.from({ length: credit.paidBeforeTrackingCount }, (_, index) => index + 1)

  return (
    <section className={cn('flex flex-col gap-4 rounded-card bg-card p-5 shadow-card lg:p-6', className)}>
      <h2 id={titleId} className="text-card-title text-text-primary">
        {translate('schedule.title')}
      </h2>
      <ul aria-labelledby={titleId} className="flex flex-col">
        {before.map((number) => (
          <ScheduleRow
            key={`before-${number}`}
            number={number}
            title={translate('schedule.unknownDate')}
            note="paidBefore"
            state="paid"
            amountMinor={credit.regularInstallmentMinor}
            currency={credit.currency}
          />
        ))}
        {credit.installments.map((installment) => (
          <ScheduleRow
            key={installment.id}
            number={installment.sequenceNo}
            title={dayText(installment.dueOn, locale, true)}
            note={noteOf(installment, next, lastId)}
            state={installment.state}
            amountMinor={installment.plannedMinor}
            currency={credit.currency}
            onPayAction={payable && installment === next ? () => pay(installment.id) : undefined}
          />
        ))}
      </ul>
      {credit.scheduleAccuracy === 'estimated' && (
        <p className="text-caption text-text-secondary">{translate('schedule.estimated')}</p>
      )}
      {credit.paidBeforeTrackingCount > 0 && (
        <p className="text-caption text-text-secondary">
          {translate('schedule.paidBefore', { count: credit.paidBeforeTrackingCount })}
        </p>
      )}
    </section>
  )
}
