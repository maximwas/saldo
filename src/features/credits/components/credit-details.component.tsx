'use client'

import { useLocale, useTranslations } from 'next-intl'
import { Amount } from '@/components/ui/amount.component'
import { Card } from '@/components/ui/card.component'
import type { Credit } from '../api/credits.api'
import { useCredits } from '../hooks/credits.hook'
import { activeInstallments, creditProgress, dayText, moneyText } from '../utils/credits.utils'

type CreditDetailsProps = {
  credit: Credit
}

type DetailRowProps = {
  label: string
  children: React.ReactNode
}

// Figma «Saldo» → DetailRow 2:21449: caption label on the left, body-medium value on the right, a hairline under it
function DetailRow({ label, children }: DetailRowProps) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-border py-3 last:border-b-0">
      <dt className="text-caption text-text-secondary">{label}</dt>
      <dd className="text-right text-body font-medium text-text-primary">{children}</dd>
    </div>
  )
}

// Figma «Saldo» → Credit card 2:49412, Details: the §9 fields; an unknown one reads «unknown», never 0
export function CreditDetails({ credit }: CreditDetailsProps) {
  const translate = useTranslations('credits')
  const locale = useLocale()
  const accounts = useCredits().data?.accounts ?? []
  const progress = creditProgress(credit)
  const last = activeInstallments(credit).at(-1)
  const account = accounts.find((option) => option.id === credit.accountId)?.name
  const unknown = translate('details.unknown')
  const money = (minor: number | null) => moneyText(minor, credit.currency, locale)

  return (
    <Card title={translate('details.title')}>
      <dl className="flex flex-col">
        <DetailRow label={translate('details.purchase')}>{credit.name}</DetailRow>
        <DetailRow label={translate('details.lender')}>{credit.lender ?? unknown}</DetailRow>
        <DetailRow label={translate('details.price')}>
          <Amount minor={credit.purchasePriceMinor} currency={credit.currency} />
        </DetailRow>
        <DetailRow label={translate('details.total')}>
          <Amount minor={credit.totalPayableMinor} currency={credit.currency} />
        </DetailRow>
        <DetailRow label={translate('details.fees')}>{credit.feesNote ?? unknown}</DetailRow>
        <DetailRow label={translate('details.openedOn')}>
          {credit.openedOn ? dayText(credit.openedOn, locale, true) : unknown}
        </DetailRow>
        <DetailRow label={translate('details.regular')}>
          {translate('perInstallment', {
            amount: money(credit.regularInstallmentMinor),
            count: credit.installmentsCount,
          })}
        </DetailRow>
        {last && (
          <DetailRow label={translate('details.last')}>
            {translate('details.amountOn', {
              amount: money(last.plannedMinor),
              date: dayText(last.dueOn, locale, true),
            })}
          </DetailRow>
        )}
        <DetailRow label={translate('details.paid')}>
          {translate('details.paidValue', {
            paid: progress.paidCount,
            total: progress.steps.length,
            amount: money(progress.paidMinor),
          })}
        </DetailRow>
        <DetailRow label={translate('details.left')}>
          {translate('details.leftValue', {
            count: progress.openCount,
            amount: money(progress.remainingMinor),
          })}
        </DetailRow>
        <DetailRow label={translate('details.account')}>{account ?? translate('details.noAccount')}</DetailRow>
        <DetailRow label={translate('details.accuracy')}>
          {translate(`details.accuracyValue.${credit.scheduleAccuracy}`)}
        </DetailRow>
      </dl>
    </Card>
  )
}
