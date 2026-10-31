'use client'

import type { Route } from 'next'
import Link from 'next/link'
import { useLocale, useTranslations } from 'next-intl'
import { Amount } from '@/components/ui/amount.component'
import { Badge } from '@/components/ui/badge.component'
import { Button } from '@/components/ui/button.component'
import { ServiceLogo } from '@/components/ui/service-logo.component'
import { useToday } from '@/contexts/clock.context'
import { useCanWrite } from '@/contexts/ledger.context'
import type { Credit, CreditInstallment } from '../api/credits.api'
import { useCredits, usePayInstallment } from '../hooks/credits.hook'
import { type CreditProgress, creditProgress, dayText, moneyText } from '../utils/credits.utils'
import { InstallmentSteps } from './installment-steps.component'

type CreditRowProps = {
  credit: Credit
}

type StepsBlockProps = {
  title: string
  credit: Credit
  progress: CreditProgress
  /** «Next 05.11 · 2 708,25 ₴» on desktop, the date alone on mobile */
  nextText: string | null
}

/** «today», «instalment N · date» (date passed) or «next date», with the amount for desktop */
function useNextTexts(credit: Credit, next: CreditInstallment | null) {
  const translate = useTranslations('credits')
  const locale = useLocale()
  const today = useToday()

  if (!next) {
    return null
  }

  const amount = moneyText(next.remainingMinor, credit.currency, locale)
  const date = dayText(next.dueOn, locale)

  if (next.state === 'unconfirmed') {
    return {
      full: translate('unconfirmedNext', {
 number: next.sequenceNo,
date,
amount 
}),
      short: translate('unconfirmedShort', {
 number: next.sequenceNo,
date 
}),
    }
  }

  if (next.dueOn === today) {
    return {
      full: translate('today', { amount }),
      short: translate('todayShort'),
    }
  }

  return {
    full: translate('next', {
 date,
amount 
}),
    short: translate('nextShort', { date }),
  }
}

// Figma «Saldo» → InstallmentSteps 2:10378: title + «amount × count», the segments, «N of M paid» + the next one
function StepsBlock({ title, credit, progress, nextText }: StepsBlockProps) {
  const translate = useTranslations('credits')
  const locale = useLocale()

  return (
    <div className="flex min-w-0 flex-col gap-3 lg:flex-1">
      <div className="flex items-baseline justify-between gap-3">
        <span className="min-w-0 truncate text-body font-medium text-text-primary">{title}</span>
        <span className="shrink-0 text-label text-text-secondary">
          {translate('perInstallment', {
            amount: moneyText(credit.regularInstallmentMinor, credit.currency, locale),
            count: credit.installmentsCount,
          })}
        </span>
      </div>
      <InstallmentSteps steps={progress.steps} />
      <div className="flex items-center justify-between gap-3">
        <span className="text-label font-medium text-text-primary">
          {translate('paidOf', {
            paid: progress.paidCount,
            total: progress.steps.length,
          })}
        </span>
        {nextText && <span className="text-right text-label text-text-secondary">{nextText}</span>}
      </div>
    </div>
  )
}

// Figma «Saldo» → Credits 2:31057 (desktop row 2:45563: logo, lender + «purpose · account» + pill, steps, balance 160
// wide, «Paid») and 2:39905 (mobile row 2:45824: head with logo, lender, remaining, «until» and «Paid», the pill, then
// the steps under the purpose).
export function CreditRow({ credit }: CreditRowProps) {
  const translate = useTranslations('credits')
  const locale = useLocale()
  const canWrite = useCanWrite()
  const accounts = useCredits().data?.accounts ?? []
  const pay = usePayInstallment()
  const progress = creditProgress(credit)
  const nextTexts = useNextTexts(credit, progress.next)
  const account = accounts.find((option) => option.id === credit.accountId)?.name
  const title = credit.lender ?? credit.name
  const purpose = [credit.lender ? credit.name : null, account].filter(Boolean).join(' · ')
  const next = progress.next
  const payButton = canWrite && next && credit.status === 'active' && (
    <Button size="s" variant="secondary" className="shrink-0" onClick={() => pay(next.id)}>
      {translate('actions.paid')}
    </Button>
  )
  const badges = (
    <>
      {progress.steps.includes('unconfirmed') && <Badge tone="warning">{translate('state.unconfirmed')}</Badge>}
      {credit.status !== 'active' && <Badge tone="muted">{translate(`status.${credit.status}`)}</Badge>}
    </>
  )
  const link = (
    <Link
      href={`/payments/credits/${credit.id}` as Route}
      className="max-w-full truncate rounded-xs text-body font-semibold text-text-primary outline-none hover:text-primary-text focus-visible:ring-2 focus-visible:ring-primary"
    >
      {title}
    </Link>
  )

  return (
    <li className="flex flex-col gap-3 border-b border-border py-4 last:border-b-0 lg:flex-row lg:items-center lg:gap-5">
      <div className="flex items-center gap-3 lg:hidden">
        <ServiceLogo name={title} />
        <div className="flex min-w-0 flex-1 flex-col items-start">
          {link}
          <Amount minor={progress.remainingMinor} currency={credit.currency} kind="plan" />
          {progress.endOn && (
            <span className="text-caption text-text-tertiary">
              {translate('until', { date: dayText(progress.endOn, locale, true) })}
            </span>
          )}
        </div>
        {payButton}
      </div>
      <div className="flex flex-col items-start gap-3 empty:hidden lg:hidden">{badges}</div>
      <div className="lg:hidden">
        <StepsBlock title={credit.name} credit={credit} progress={progress} nextText={nextTexts?.short ?? null} />
      </div>
      <ServiceLogo name={title} className="max-lg:hidden" />
      <div className="flex w-50 shrink-0 flex-col items-start gap-1 max-lg:hidden">
        {link}
        {purpose && <span className="max-w-full truncate text-label text-text-secondary">{purpose}</span>}
        {badges}
      </div>
      <div className="flex min-w-0 flex-1 max-lg:hidden">
        <StepsBlock
          title={translate('installments')}
          credit={credit}
          progress={progress}
          nextText={nextTexts?.full ?? null}
        />
      </div>
      <div className="flex w-40 shrink-0 flex-col items-end gap-0.5 max-lg:hidden">
        <span className="text-caption text-text-tertiary">{translate('remaining')}</span>
        <Amount minor={progress.remainingMinor} currency={credit.currency} kind="plan" />
        {progress.endOn && (
          <span className="text-caption text-text-secondary">
            {translate('endsOn', { date: dayText(progress.endOn, locale, true) })}
          </span>
        )}
      </div>
      <div className="max-lg:hidden">{payButton}</div>
    </li>
  )
}
