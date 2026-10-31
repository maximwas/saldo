'use client'

import { useTranslations } from 'next-intl'
import { Amount } from '@/components/ui/amount.component'
import { useToday } from '@/contexts/clock.context'
import { useLedgerStore } from '@/contexts/ledger.context'
import { useSubscriptionRates, useSubscriptions } from '../hooks/subscriptions.hook'
import { plansPayments } from '../utils/subscription-series.utils'
import { subscriptionTotals, type Total } from '../utils/subscriptions.utils'

type TotalCardProps = {
  label: string
  total: Total
  note: string
}

function TotalCard({ label, total, note }: TotalCardProps) {
  const translate = useTranslations('subscriptions.totals')
  const baseCurrency = useLedgerStore((ledger) => ledger.baseCurrency)

  return (
    <div className="flex flex-col gap-2 rounded-card bg-card p-5 shadow-card lg:p-6">
      <p className="text-label text-text-secondary">{label}</p>
      <Amount minor={total.totalMinor} currency={baseCurrency} size="l" />
      <p className="text-caption text-text-secondary">
        {total.unknownCount > 0 ? translate('unknown', { count: total.unknownCount }) : note}
      </p>
    </div>
  )
}

// Figma «Saldo» → Subscriptions 2:17361: two separate totals (§8) — the payments this month plans and the normalized
// monthly cost; a yearly price is divided by 12, never counted as a monthly expense. An unknown amount or a missing
// rate is left out and said so, never added as 0.
export function SubscriptionTotals() {
  const translate = useTranslations('subscriptions.totals')
  const today = useToday()
  const baseCurrency = useLedgerStore((ledger) => ledger.baseCurrency)
  const subscriptions = useSubscriptions()
  const rates = useSubscriptionRates()

  if (!subscriptions.data || !rates.data) {
    return <div aria-busy className="h-32 rounded-card bg-subtle" />
  }

  const totals = subscriptionTotals({
    subscriptions: subscriptions.data.filter(plansPayments),
    month: today.slice(0, 7),
    date: today,
    baseCurrency,
    rates: rates.data,
  })

  return (
    <div className="grid gap-4 lg:grid-cols-2 lg:gap-6">
      <TotalCard label={translate('planned')} total={totals.planned} note={translate('plannedNote')} />
      <TotalCard label={translate('normalized')} total={totals.normalized} note={translate('normalizedNote')} />
    </div>
  )
}
