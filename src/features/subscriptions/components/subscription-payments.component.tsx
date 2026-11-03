'use client'

import { useTranslations } from 'next-intl'
import { Amount } from '@/components/ui/amount.component'
import { Badge } from '@/components/ui/badge.component'
import { ErrorState } from '@/components/ui/error-state.component'
import { ServiceLogo } from '@/components/ui/service-logo.component'
import { useToday } from '@/contexts/clock.context'
import { useScreenQueryState } from '@/lib/query/screen-query-state.hook'
import type { SubscriptionPayment } from '../api/subscriptions.api'
import { useDateLabel } from '../hooks/date-label.hook'
import { useSubscription, useSubscriptionPayments } from '../hooks/subscriptions.hook'
import { newestFirst, recentPayments } from '../utils/subscription-payments.utils'

const STATE_TONE = {
  plan: 'plan',
  partial: 'info',
  unconfirmed: 'warning',
  paid: 'positive',
} as const

/** a paid payment shows what was paid, an open one its plan (unknown stays unknown, §7) */
const shownMinor = (payment: SubscriptionPayment) =>
  payment.state === 'paid' ? payment.paidMinor : payment.plannedMinor

type SubscriptionPaymentsProps = {
  subscriptionId: string
  /** Overview shows the last paid and the next two; History shows all */
  view: 'recent' | 'all'
  action?: React.ReactNode
}

// Figma «Saldo» → Subscription card 2:21453 «Latest and next payments»: logo, «Payment dd.MM», account + state, amount
// and full date on the right. Paid ones keep the amount they were paid at: a later price never reaches them (§8).
export function SubscriptionPayments({ subscriptionId, view, action }: SubscriptionPaymentsProps) {
  const translate = useTranslations('subscriptions.payments')
  const translateState = useTranslations('subscriptions.paymentState')
  const today = useToday()
  const dateLabel = useDateLabel()
  const { data: subscription } = useSubscription(subscriptionId)
  const query = useSubscriptionPayments(subscriptionId)
  const { data } = query
  const { failedLoad, retry } = useScreenQueryState([query], translate('refreshFailed'))
  const shown = view === 'recent' ? recentPayments(data ?? [], today) : newestFirst(data ?? [])

  // the error card takes the section's place: a card inside the card would double the frame
  if (failedLoad) {
    return <ErrorState title={translate('loadFailed')} onRetryAction={retry} />
  }

  return (
    <section className="flex flex-col gap-4 rounded-card bg-card p-5 shadow-card lg:p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-card-title text-text-primary">{translate(view === 'recent' ? 'recent' : 'all')}</h2>
        {action}
      </div>
      {data === undefined ? <div aria-busy className="h-32 rounded-md bg-subtle" /> : null}
      {data && shown.length === 0 ? <p className="text-label text-text-secondary">{translate('empty')}</p> : null}
      <ul className="flex flex-col gap-4">
        {shown.map((payment) => (
          <li key={payment.id} className="flex items-center gap-4">
            <ServiceLogo name={subscription?.name ?? ''} />
            <span className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="text-body font-medium text-text-primary">
                {translate('payment', { date: dateLabel(payment.dueOn) })}
              </span>
              <Badge tone={STATE_TONE[payment.state]}>{translateState(payment.state)}</Badge>
            </span>
            <span className="flex shrink-0 flex-col items-end gap-1">
              <Amount
                minor={shownMinor(payment)}
                currency={payment.currency}
                kind={payment.state === 'paid' ? 'fact' : 'plan'}
              />
              <span className="text-caption text-text-secondary">{dateLabel(payment.dueOn, true)}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}
