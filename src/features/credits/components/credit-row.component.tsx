'use client'

import type { Route } from 'next'
import Link from 'next/link'
import { useLocale, useTranslations } from 'next-intl'
import { Amount } from '@/components/ui/amount.component'
import { Badge } from '@/components/ui/badge.component'
import { Button } from '@/components/ui/button.component'
import { useToday } from '@/contexts/clock.context'
import { useCanWrite } from '@/contexts/ledger.context'
import type { Credit, CreditInstallment } from '../api/credits.api'
import { useCredits, usePayInstallment } from '../hooks/credits.hook'
import { creditProgress, dayText, moneyText } from '../utils/credits.utils'
import { CreditLogo } from './credit-logo.component'
import { InstallmentSteps } from './installment-steps.component'

type CreditRowProps = {
  credit: Credit
}

/** «today · amount», «instalment N · date» (date passed) or «next date · amount» */
function useNextText(credit: Credit, next: CreditInstallment | null) {
  const translate = useTranslations('credits')
  const locale = useLocale()
  const today = useToday()

  if (!next) {
    return null
  }

  const amount = moneyText(next.remainingMinor, credit.currency, locale)

  if (next.state === 'unconfirmed') {
    return translate('unconfirmedNext', {
      number: next.sequenceNo,
      date: dayText(next.dueOn, locale),
    })
  }

  if (next.dueOn === today) {
    return translate('today', { amount })
  }

  return translate('next', {
    date: dayText(next.dueOn, locale),
    amount,
  })
}

// Figma «Saldo» → Credits 2:31057 / 2:39905: logo, name and «lender · account» (+ «not confirmed»), the steps with
// «N of M paid» and the next installment, the remaining balance with the end date, «Paid». On mobile the
// columns stack.
export function CreditRow({ credit }: CreditRowProps) {
  const translate = useTranslations('credits')
  const locale = useLocale()
  const canWrite = useCanWrite()
  const accounts = useCredits().data?.accounts ?? []
  const pay = usePayInstallment()
  const progress = creditProgress(credit)
  const nextText = useNextText(credit, progress.next)
  const account = accounts.find((option) => option.id === credit.accountId)?.name
  const meta = [credit.lender, account].filter(Boolean).join(' · ')
  const next = progress.next

  return (
    <li className="flex flex-col gap-4 border-b border-border py-4 first:pt-0 last:border-b-0 last:pb-0 lg:flex-row lg:items-center lg:gap-6">
      <div className="flex min-w-0 items-start gap-3 lg:w-64">
        <CreditLogo name={credit.lender ?? credit.name} />
        <div className="flex min-w-0 flex-col items-start gap-1">
          <Link
            href={`/payments/credits/${credit.id}` as Route}
            className="max-w-full truncate rounded-xs text-body font-medium text-text-primary outline-none hover:text-primary-text focus-visible:ring-2 focus-visible:ring-primary"
          >
            {credit.name}
          </Link>
          {meta && <span className="max-w-full truncate text-caption text-text-secondary">{meta}</span>}
          {progress.steps.includes('unconfirmed') && <Badge tone="warning">{translate('state.unconfirmed')}</Badge>}
          {credit.status !== 'active' && <Badge tone="muted">{translate(`status.${credit.status}`)}</Badge>}
        </div>
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex justify-between gap-3 text-caption text-text-secondary">
          <span className="font-medium text-text-primary">{translate('installments')}</span>
          <span>
            {translate('perInstallment', {
              amount: moneyText(credit.regularInstallmentMinor, credit.currency, locale),
              count: credit.installmentsCount,
            })}
          </span>
        </div>
        <InstallmentSteps steps={progress.steps} />
        <div className="flex justify-between gap-3 text-caption text-text-secondary">
          <span>
            {translate('paidOf', {
              paid: progress.paidCount,
              total: progress.steps.length,
            })}
          </span>
          {nextText && <span className="text-right">{nextText}</span>}
        </div>
      </div>
      <div className="flex items-center justify-between gap-4 lg:w-60 lg:justify-end">
        <div className="flex flex-col lg:items-end">
          <span className="text-caption text-text-secondary">{translate('remaining')}</span>
          <Amount minor={progress.remainingMinor} currency={credit.currency} />
          {progress.endOn && (
            <span className="text-caption text-text-secondary">
              {translate('endsOn', { date: dayText(progress.endOn, locale, true) })}
            </span>
          )}
        </div>
        {canWrite && next && credit.status === 'active' && (
          <Button size="s" variant="secondary" onClick={() => pay(next.id)}>
            {translate('actions.paid')}
          </Button>
        )}
      </div>
    </li>
  )
}
