'use client'

import { useTranslations } from 'next-intl'
import { Amount } from '@/components/ui/amount.component'
import { useDateLabel } from '../hooks/date-label.hook'
import { useSubscription } from '../hooks/subscriptions.hook'
import { SubscriptionPayments } from './subscription-payments.component'

type SubscriptionHistoryProps = {
  subscriptionId: string
}

// History: every payment of the series (paid at the amount paid, planned at the price in force on its date) and the
// prices with their effective dates. Figma has no own frame for the tab; it reuses the card's payment rows.
export function SubscriptionHistory({ subscriptionId }: SubscriptionHistoryProps) {
  const translate = useTranslations('subscriptions.price')
  const dateLabel = useDateLabel()
  const { data: subscription } = useSubscription(subscriptionId)
  const prices = [...(subscription?.prices ?? [])].reverse()

  return (
    <>
      <SubscriptionPayments subscriptionId={subscriptionId} view="all" />
      <section className="flex flex-col gap-3 rounded-card bg-card p-5 shadow-card lg:p-6">
        <h2 className="text-card-title text-text-primary">{translate('history')}</h2>
        <ul className="flex flex-col">
          {prices.map((price) => (
            <li
              key={price.effectiveOn}
              className="flex items-center justify-between gap-3 border-border border-b py-3 last:border-b-0"
            >
              <span className="text-body text-text-primary">
                {translate('from', { date: dateLabel(price.effectiveOn, true) })}
              </span>
              <Amount minor={price.amountMinor} currency={price.currency} />
            </li>
          ))}
        </ul>
      </section>
    </>
  )
}
