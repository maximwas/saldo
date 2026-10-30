'use client'

import { ChevronLeft, TriangleAlert } from 'lucide-react'
import type { Route } from 'next'
import Link from 'next/link'
import { useLocale, useTranslations } from 'next-intl'
import { useState } from 'react'
import { ReminderRuleCard } from '@/components/reminders/reminder-rule-card.component'
import { Amount } from '@/components/ui/amount.component'
import { Badge } from '@/components/ui/badge.component'
import { Button } from '@/components/ui/button.component'
import { useCanWrite } from '@/contexts/ledger.context'
import { useCredits, usePayInstallment } from '../hooks/credits.hook'
import { activeInstallments, creditProgress, dayText, moneyText, payoffOf } from '../utils/credits.utils'
import { CloseCreditSheet } from './close-credit-sheet.component'
import { CreditDetails } from './credit-details.component'
import { CreditFormSheet } from './credit-form-sheet.component'
import { CreditLogo } from './credit-logo.component'
import { CreditSchedule } from './credit-schedule.component'
import { EarlyRepaymentSheet } from './early-repayment-sheet.component'
import { InstallmentSteps } from './installment-steps.component'

type CreditCardProps = {
  creditId: string
}

type Dialog = 'edit' | 'payoff' | 'close' | null

const STATUS_TONE = {
  active: 'positive',
  closed: 'muted',
  cancelled: 'muted',
} as const

function CardSkeleton() {
  return (
    <div aria-busy className="flex flex-col gap-4 lg:gap-6">
      <div className="h-48 rounded-card bg-subtle" />
      <div className="grid gap-4 lg:grid-cols-3 lg:gap-6">
        <div className="h-96 rounded-card bg-subtle lg:col-span-2" />
        <div className="h-96 rounded-card bg-subtle" />
      </div>
    </div>
  )
}

// Figma «Saldo» → Credit card 2:49412 / 2:50748; states: date passed 2:58976 (amber banner), viewer 2:59461 (no
// write buttons), early repayment 2:55162, edit 2:57906, delete 2:55720 (here: close, there is no delete RPC).
// «Paid» opens the confirm sheet of Upcoming payments on the installment (?pay=<id>).
export function CreditCard({ creditId }: CreditCardProps) {
  const translate = useTranslations('credits')
  const locale = useLocale()
  const canWrite = useCanWrite()
  const pay = usePayInstallment()
  const { data, isPending, isError } = useCredits()
  const [dialog, setDialog] = useState<Dialog>(null)

  if (isPending) {
    return <CardSkeleton />
  }

  const credit = data?.credits.find((candidate) => candidate.id === creditId)

  if (isError || !credit) {
    return (
      <p role="alert" className="text-body text-negative-text">
        {translate(isError ? 'loadFailed' : 'card.notFound')}
      </p>
    )
  }

  const progress = creditProgress(credit)
  const payoff = payoffOf(credit)
  const writable = canWrite && credit.status === 'active'
  const next = progress.next
  const unconfirmed = activeInstallments(credit).find((installment) => installment.state === 'unconfirmed')
  const account = data.accounts.find((option) => option.id === credit.accountId)?.name
  const meta = [
    credit.lender,
    translate('perInstallment', {
      amount: moneyText(credit.regularInstallmentMinor, credit.currency, locale),
      count: credit.installmentsCount,
    }),
    account,
  ]
    .filter(Boolean)
    .join(' · ')
  const close = () => setDialog(null)

  return (
    <>
      <Link
        href={'/payments/credits' as Route}
        className="flex w-fit cursor-pointer items-center gap-1 rounded-xs text-label font-medium text-primary-text outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <ChevronLeft className="size-4" aria-hidden />
        {translate('card.back')}
      </Link>
      {unconfirmed && (
        <p
          role="status"
          className="flex gap-3 rounded-inner bg-warning-soft p-4 text-label font-medium text-warning-text"
        >
          <TriangleAlert className="mt-0.5 size-5 shrink-0" aria-hidden />
          {translate('card.unconfirmed', {
            number: unconfirmed.sequenceNo,
            date: dayText(unconfirmed.dueOn, locale),
          })}
        </p>
      )}
      <section className="flex flex-col gap-5 rounded-card bg-card p-5 shadow-card lg:p-6">
        <header className="flex items-center justify-between gap-3">
          <h2 className="truncate text-card-title text-text-primary">{credit.name}</h2>
          {writable && (
            <Button size="s" variant="ghost" onClick={() => setDialog('edit')}>
              {translate('actions.edit')}
            </Button>
          )}
        </header>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <CreditLogo name={credit.lender ?? credit.name} />
            <div className="flex min-w-0 flex-col gap-0.5">
              <div className="flex flex-wrap items-center gap-2">
                <Amount
                  minor={credit.totalPayableMinor ?? credit.purchasePriceMinor}
                  currency={credit.currency}
                  size="m"
                />
                <Badge tone={STATUS_TONE[credit.status]}>{translate(`status.${credit.status}`)}</Badge>
              </div>
              <span className="text-caption text-text-secondary">{meta}</span>
            </div>
          </div>
          {writable && (
            <div className="flex flex-col-reverse gap-3 sm:flex-row">
              {payoff && (
                <Button variant="secondary" onClick={() => setDialog('payoff')}>
                  {translate('actions.payoff')}
                </Button>
              )}
              {next && (
                <Button onClick={() => pay(next.id)}>
                  {translate('actions.payNumber', { number: next.sequenceNo })}
                </Button>
              )}
            </div>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap justify-between gap-x-3 gap-y-1 text-caption text-text-secondary">
            <span className="font-medium text-text-primary">{translate('card.schedule')}</span>
            {progress.endOn && (
              <span>
                {translate('card.remainingUntil', {
                  amount: moneyText(progress.remainingMinor, credit.currency, locale),
                  date: dayText(progress.endOn, locale, true),
                })}
              </span>
            )}
          </div>
          <InstallmentSteps steps={progress.steps} />
          <div className="flex flex-wrap justify-between gap-x-3 gap-y-1 text-caption text-text-secondary">
            <span>
              {translate('card.paidSummary', {
                paid: progress.paidCount,
                total: progress.steps.length,
                amount: moneyText(progress.paidMinor, credit.currency, locale),
              })}
            </span>
            {next && (
              <span>
                {translate('next', {
                  date: dayText(next.dueOn, locale),
                  amount: moneyText(next.remainingMinor, credit.currency, locale),
                })}
              </span>
            )}
          </div>
        </div>
      </section>
      <div className="grid items-start gap-4 lg:grid-cols-3 lg:gap-6">
        <CreditSchedule credit={credit} className="lg:col-span-2" />
        <div className="flex flex-col gap-4 lg:gap-6">
          <CreditDetails credit={credit} />
          <ReminderRuleCard sourceType="credit" sourceId={credit.id} />
          {writable && (
            <section className="flex flex-col gap-4 rounded-card bg-card p-5 shadow-card lg:p-6">
              <h2 className="text-card-title text-text-primary">{translate('card.manage')}</h2>
              <p className="text-caption text-text-secondary">{translate('card.manageText')}</p>
              <Button variant="danger" className="w-fit" onClick={() => setDialog('close')}>
                {translate('actions.close')}
              </Button>
            </section>
          )}
        </div>
      </div>
      {dialog === 'edit' && <CreditFormSheet credit={credit} onCloseAction={close} />}
      {dialog === 'payoff' && payoff && <EarlyRepaymentSheet credit={credit} payoff={payoff} onCloseAction={close} />}
      {dialog === 'close' && <CloseCreditSheet credit={credit} onCloseAction={close} />}
    </>
  )
}
