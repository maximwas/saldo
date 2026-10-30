'use client'

import { ChevronRight } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useState } from 'react'
import { Amount } from '@/components/ui/amount.component'
import { Button } from '@/components/ui/button.component'
import { notify } from '@/components/ui/toaster.component'
import { useToday } from '@/contexts/clock.context'
import { useCanWrite } from '@/contexts/ledger.context'
import type { SubscriptionView } from '../api/subscriptions.api'
import { useDateLabel } from '../hooks/date-label.hook'
import { useSubscriptionParams } from '../hooks/subscription-params.hook'
import { useSubscription, useSubscriptionOptions, useUpdateSubscription } from '../hooks/subscriptions.hook'
import { toStatusChangeInput } from '../schemas/subscription-form.schema'
import { nextPaymentOn, shownPrice } from '../utils/subscription-series.utils'
import { monthlyCost, priceOn } from '../utils/subscriptions.utils'
import { CancelSheet } from './cancel-sheet.component'
import { ConfirmStatusSheet } from './confirm-status-sheet.component'
import { PriceSheet } from './price-sheet.component'
import { SubscriptionPayments } from './subscription-payments.component'

type DetailRowProps = {
  label: string
  children: React.ReactNode
}

// Figma «Saldo» → DetailRow: label on the left in secondary, value on the right, a hairline between rows
function DetailRow({ label, children }: DetailRowProps) {
  return (
    <div className="flex items-center justify-between gap-4 border-border border-b py-3 last:border-b-0">
      <dt className="text-label text-text-secondary">{label}</dt>
      <dd className="min-w-0 truncate text-right text-body text-text-primary">{children}</dd>
    </div>
  )
}

type CardProps = {
  subscription: SubscriptionView
}

function Details({ subscription }: CardProps) {
  const translate = useTranslations('subscriptions')
  const today = useToday()
  const dateLabel = useDateLabel()
  const options = useSubscriptionOptions()
  const price = shownPrice(subscription, today)
  const monthly = monthlyCost(subscription, today)
  const nextOn = nextPaymentOn(subscription, today)
  const nameOf = (
    list:
      | {
          id: string
          name: string
        }[]
      | undefined,
    id: string | null,
  ) => list?.find((item) => item.id === id)?.name ?? translate('details.none')

  return (
    <section className="flex flex-col rounded-card bg-card p-5 shadow-card lg:p-6">
      <h2 className="pb-2 text-card-title text-text-primary">{translate('details.title')}</h2>
      <dl className="flex flex-col">
        <DetailRow label={translate('details.amount')}>
          <Amount minor={price.amountMinor} currency={price.currency} />
        </DetailRow>
        <DetailRow label={translate('details.monthly')}>
          <Amount minor={monthly.amountMinor} currency={monthly.currency} kind="plan" />
        </DetailRow>
        <DetailRow label={translate('details.interval')}>
          {translate('interval', {
            unit: subscription.unit,
            count: subscription.count,
          })}
        </DetailRow>
        {subscription.unit === 'day' ? null : (
          <DetailRow label={translate('details.shortMonth')}>
            {translate(`form.rules.${subscription.shortMonthRule}`)}
          </DetailRow>
        )}
        <DetailRow label={translate('details.firstOn')}>{dateLabel(subscription.firstOn, true)}</DetailRow>
        <DetailRow label={translate('details.nextOn')}>
          {nextOn ? dateLabel(nextOn, true) : translate('details.none')}
        </DetailRow>
        <DetailRow label={translate('details.account')}>
          {nameOf(options.data?.accounts, subscription.accountId)}
        </DetailRow>
        <DetailRow label={translate('details.category')}>
          {nameOf(options.data?.categories, subscription.categoryId)}
        </DetailRow>
        <DetailRow label={translate('details.trial')}>
          {subscription.trialEndsOn ? dateLabel(subscription.trialEndsOn, true) : translate('details.trialNone')}
        </DetailRow>
        {subscription.cancelledOn ? (
          <DetailRow label={translate('details.cancelledOn')}>{dateLabel(subscription.cancelledOn, true)}</DetailRow>
        ) : null}
        {subscription.accessEndsOn ? (
          <DetailRow label={translate('details.accessEndsOn')}>{dateLabel(subscription.accessEndsOn, true)}</DetailRow>
        ) : null}
        {subscription.serviceUrl ? (
          <DetailRow label={translate('details.serviceUrl')}>{subscription.serviceUrl}</DetailRow>
        ) : null}
        {subscription.note ? <DetailRow label={translate('details.note')}>{subscription.note}</DetailRow> : null}
      </dl>
    </section>
  )
}

// Figma «Saldo» → the «Price» card: the price in force and any later one with its date, «Change price» (5:107213)
function PriceCard({ subscription }: CardProps) {
  const translate = useTranslations('subscriptions.price')
  const today = useToday()
  const dateLabel = useDateLabel()
  const canWrite = useCanWrite()
  const [changing, setChanging] = useState(false)
  const current = priceOn(subscription.prices, today)
  const later = subscription.prices.filter((price) => price.effectiveOn > today)
  const shown = current ? [current, ...later] : later

  return (
    <section className="flex flex-col gap-3 rounded-card bg-card p-5 shadow-card lg:p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-card-title text-text-primary">{translate('title')}</h2>
        {canWrite && !subscription.archivedAt ? (
          <Button size="s" variant="ghost" onClick={() => setChanging(true)}>
            {translate('change')}
            <ChevronRight aria-hidden className="size-4" />
          </Button>
        ) : null}
      </div>
      <ul className="flex flex-col">
        {shown.map((price) => (
          <li
            key={price.effectiveOn}
            className="flex items-center justify-between gap-3 border-border border-b py-3 last:border-b-0"
          >
            <span className="flex flex-col gap-0.5">
              <span className="text-body font-medium text-text-primary">
                {translate(price === current ? 'current' : 'upcoming')}
              </span>
              <span className="text-caption text-text-secondary">
                {translate('from', { date: dateLabel(price.effectiveOn, true) })}
              </span>
            </span>
            <Amount minor={price.amountMinor} currency={price.currency} />
          </li>
        ))}
      </ul>
      <p className="text-caption text-text-secondary">{translate('hint')}</p>
      {changing ? <PriceSheet subscriptionId={subscription.id} onCloseAction={() => setChanging(false)} /> : null}
    </section>
  )
}

type Dialog = 'cancel' | 'pause' | null

// Figma «Saldo» → the «Cancellation» card and Subscriptions · Cancel 5:98726 / · Pause 5:97627: cancelling in Saldo does
// not cancel the service (§8); intent, confirmed cancel and the end of access are separate. A viewer only reads.
function CancellationCard({ subscription }: CardProps) {
  const translate = useTranslations('subscriptions.cancel')
  const today = useToday()
  const canWrite = useCanWrite()
  const update = useUpdateSubscription()
  const [dialog, setDialog] = useState<Dialog>(null)
  const active = ['trial', 'active', 'cancel_intended'].includes(subscription.status)

  const resume = () =>
    update.mutate(
      toStatusChangeInput(
        subscription,
        {
          status: 'active',
          cancelledOn: null,
          accessEndsOn: null,
        },
        today,
      ),
      { onSuccess: () => notify.success(translate('resumed')) },
    )

  if (subscription.archivedAt) {
    return null
  }

  return (
    <section className="flex flex-col gap-3 rounded-card bg-card p-5 shadow-card lg:p-6">
      <h2 className="text-card-title text-text-primary">{translate('title')}</h2>
      <p className="text-label text-text-secondary">{translate('hint', { name: subscription.name })}</p>
      {canWrite && active ? (
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => setDialog('cancel')}>
            {translate(subscription.status === 'cancel_intended' ? 'confirm' : 'open')}
          </Button>
          <Button variant="ghost" onClick={() => setDialog('pause')}>
            {translate('pause')}
          </Button>
        </div>
      ) : null}
      {canWrite && !active ? (
        <Button variant="secondary" onClick={resume} disabled={update.isPending}>
          {translate('resume')}
        </Button>
      ) : null}
      {dialog === 'cancel' ? (
        <CancelSheet subscriptionId={subscription.id} onCloseAction={() => setDialog(null)} />
      ) : null}
      {dialog === 'pause' ? (
        <ConfirmStatusSheet subscriptionId={subscription.id} kind="pause" onCloseAction={() => setDialog(null)} />
      ) : null}
    </section>
  )
}

type SubscriptionOverviewProps = {
  subscriptionId: string
}

// Figma «Saldo» → Subscription card 2:21453 (desktop: details on the left, price and cancellation on the right; mobile
// 2:21781 stacks them), then the latest and next payments with a link to History
export function SubscriptionOverview({ subscriptionId }: SubscriptionOverviewProps) {
  const translate = useTranslations('subscriptions.payments')
  const { data: subscription } = useSubscription(subscriptionId)
  const { setParams } = useSubscriptionParams()

  if (!subscription) {
    return null
  }

  return (
    <>
      <div className="grid gap-4 lg:grid-cols-3 lg:gap-6">
        <div className="min-w-0 lg:col-span-2">
          <Details subscription={subscription} />
        </div>
        <div className="flex min-w-0 flex-col gap-4 lg:gap-6">
          <PriceCard subscription={subscription} />
          <CancellationCard subscription={subscription} />
        </div>
      </div>
      <SubscriptionPayments
        subscriptionId={subscription.id}
        view="recent"
        action={
          <Button size="s" variant="ghost" onClick={() => setParams({ tab: 'history' })}>
            {translate('toHistory')}
            <ChevronRight aria-hidden className="size-4" />
          </Button>
        }
      />
    </>
  )
}
