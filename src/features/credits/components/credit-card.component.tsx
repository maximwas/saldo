'use client'

import { ChevronLeft } from 'lucide-react'
import type { Route } from 'next'
import Link from 'next/link'
import { useLocale, useTranslations } from 'next-intl'
import { useState } from 'react'
import { ReminderRuleCard } from '@/components/reminders/reminder-rule-card.component'
import { Amount } from '@/components/ui/amount.component'
import { Badge } from '@/components/ui/badge.component'
import { Banner } from '@/components/ui/banner.component'
import { Button } from '@/components/ui/button.component'
import { Card } from '@/components/ui/card.component'
import { ServiceLogo } from '@/components/ui/service-logo.component'
import { useCanWrite } from '@/contexts/ledger.context'
import { useCredits, usePayInstallment } from '../hooks/credits.hook'
import { activeInstallments, creditProgress, dayText, moneyText, payoffOf } from '../utils/credits.utils'
import { CloseCreditSheet } from './close-credit-sheet.component'
import { CreditDetails } from './credit-details.component'
import { CreditFormSheet } from './credit-form-sheet.component'
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
  const close = () => setDialog(null)
  const monthly = translate('card.monthly', {
    day: Number((next ?? activeInstallments(credit)[0])?.dueOn.slice(8, 10)),
  })
  const meta = [
    credit.lender,
    translate('perInstallment', {
      amount: moneyText(credit.regularInstallmentMinor, credit.currency, locale),
      count: credit.installmentsCount,
    }),
    monthly,
    account,
  ]
    .filter(Boolean)
    .join(' · ')

  const paidText = translate('card.paidSummary', {
    paid: progress.paidCount,
    total: progress.steps.length,
    amount: moneyText(progress.paidMinor, credit.currency, locale),
  })
  const nextAmount = next ? moneyText(next.remainingMinor, credit.currency, locale) : null
  const unconfirmedNext = unconfirmed
    ? translate('card.unconfirmedNext', {
        number: unconfirmed.sequenceNo,
        date: dayText(unconfirmed.dueOn, locale),
      })
    : null
  const archive = writable && (
    <Button variant="secondary" onClick={() => setDialog('close')}>
      {translate('actions.close')}
    </Button>
  )
  const actions = writable && (
    <>
      {next && (
        <Button onClick={() => pay(next.id)}>{translate('actions.payNumber', { number: next.sequenceNo })}</Button>
      )}
      {payoff && (
        <Button variant="secondary" onClick={() => setDialog('payoff')}>
          {translate('actions.payoff')}
        </Button>
      )}
    </>
  )

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
        <Banner
          kind="warning"
          role="status"
          action={
            writable &&
            next && (
              <button type="button" className="cursor-pointer" onClick={() => pay(unconfirmed.id)}>
                {translate('card.unconfirmedAction')}
              </button>
            )
          }
        >
          {translate('card.unconfirmed', {
            number: unconfirmed.sequenceNo,
            date: dayText(unconfirmed.dueOn, locale),
          })}
        </Banner>
      )}
      {!canWrite && <Banner>{translate('card.viewOnly')}</Banner>}
      <Card
        title={credit.name}
        action={
          writable
            ? {
                label: translate('actions.edit'),
                onClickAction: () => setDialog('edit'),
              }
            : undefined
        }
      >
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-4 pb-5">
            <ServiceLogo name={credit.lender ?? credit.name} />
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <div className="flex flex-wrap items-center gap-3">
                <Amount
                  minor={credit.totalPayableMinor ?? credit.purchasePriceMinor}
                  currency={credit.currency}
                  size="m"
                />
                <Badge tone={STATUS_TONE[credit.status]}>{translate(`status.${credit.status}`)}</Badge>
              </div>
              <span className="text-label text-text-secondary">{meta}</span>
            </div>
            <div className="flex items-center gap-4 max-lg:hidden">
              {payoff && writable && (
                <Button variant="secondary" onClick={() => setDialog('payoff')}>
                  {translate('actions.payoff')}
                </Button>
              )}
              {next && writable && (
                <Button onClick={() => pay(next.id)}>
                  {translate('actions.payNumber', { number: next.sequenceNo })}
                </Button>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-body font-medium text-text-primary">{translate('card.schedule')}</span>
              {progress.endOn && (
                <span className="text-label text-text-secondary">
                  <span className="max-lg:hidden">
                    {translate('card.remainingUntil', {
                      amount: moneyText(progress.remainingMinor, credit.currency, locale),
                      date: dayText(progress.endOn, locale, true),
                    })}
                  </span>
                  <span className="lg:hidden">
                    {translate('card.until', { date: dayText(progress.endOn, locale, true) })}
                  </span>
                </span>
              )}
            </div>
            <InstallmentSteps steps={progress.steps} />
            <div className="flex items-center justify-between gap-3">
              <span className="text-label font-medium text-text-primary">
                <span className="max-lg:hidden">{paidText}</span>
                <span className="lg:hidden">
                  {translate('card.paidShort', {
                    paid: progress.paidCount,
                    total: progress.steps.length,
                  })}
                </span>
              </span>
              {next && (
                <span className="text-right text-label text-text-secondary">
                  {unconfirmedNext ?? (
                    <>
                      <span className="max-lg:hidden">
                        {translate('next', {
                          date: dayText(next.dueOn, locale),
                          amount: nextAmount ?? '',
                        })}
                      </span>
                      <span className="lg:hidden">{translate('nextShort', { date: dayText(next.dueOn, locale) })}</span>
                    </>
                  )}
                </span>
              )}
            </div>
          </div>
          {writable && <div className="flex flex-col gap-2 lg:hidden">{actions}</div>}
        </div>
      </Card>
      <div className="flex flex-col items-start gap-4 lg:flex-row lg:gap-6">
        <CreditSchedule credit={credit} className="w-full lg:flex-1" />
        <div className="flex w-full flex-col gap-4 lg:w-100 lg:shrink-0 lg:gap-6">
          <CreditDetails
            credit={credit}
            footer={writable && <div className="flex gap-3 pt-4 lg:hidden">{archive}</div>}
          />
          <ReminderRuleCard sourceType="credit" sourceId={credit.id} />
          {writable && (
            <Card title={translate('card.manage')} className="max-lg:hidden">
              <p className="text-label text-text-secondary">{translate('card.manageText')}</p>
              <div className="flex gap-3 pt-4">{archive}</div>
            </Card>
          )}
        </div>
      </div>
      {dialog === 'edit' && <CreditFormSheet credit={credit} onCloseAction={close} />}
      {dialog === 'payoff' && payoff && <EarlyRepaymentSheet credit={credit} payoff={payoff} onCloseAction={close} />}
      {dialog === 'close' && <CloseCreditSheet credit={credit} onCloseAction={close} />}
    </>
  )
}
