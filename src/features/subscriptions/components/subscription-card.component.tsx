'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Amount } from '@/components/ui/amount.component'
import { Button } from '@/components/ui/button.component'
import { ErrorState } from '@/components/ui/error-state.component'
import { ServiceLogo } from '@/components/ui/service-logo.component'
import { Bone } from '@/components/ui/skeleton.component'
import { Tabs } from '@/components/ui/tabs.component'
import { useToday } from '@/contexts/clock.context'
import { useCanWrite } from '@/contexts/ledger.context'
import { useScreenQueryState } from '@/lib/query/screen-query-state.hook'
import type { SubscriptionView } from '../api/subscriptions.api'
import { useDateLabel } from '../hooks/date-label.hook'
import { CARD_TABS, type CardTab, useSubscriptionParams } from '../hooks/subscription-params.hook'
import { useSubscription } from '../hooks/subscriptions.hook'
import { nextPaymentOn, shownPrice } from '../utils/subscription-series.utils'
import { SubscriptionHistory } from './subscription-history.component'
import { SubscriptionOverview } from './subscription-overview.component'
import { SubscriptionState, VerdictControl } from './subscription-row.component'
import { SubscriptionSettings } from './subscription-settings.component'

type SubscriptionHeaderProps = {
  subscription: SubscriptionView
}

// Figma «Saldo» → Subscription card 2:21453 / 2:21781, the top card: name + «Edit», logo, the next payment's amount,
// «period · next date» + state, the assessment on the right
function SubscriptionHeader({ subscription }: SubscriptionHeaderProps) {
  const translate = useTranslations('subscriptions')
  const today = useToday()
  const dateLabel = useDateLabel()
  const canWrite = useCanWrite()
  const { setParams } = useSubscriptionParams()
  const price = shownPrice(subscription, today)
  const nextOn = nextPaymentOn(subscription, today)

  return (
    <section className="flex flex-col gap-4 rounded-card bg-card p-5 shadow-card lg:p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="truncate text-card-title text-text-primary">{subscription.name}</h2>
        {canWrite ? (
          <Button size="s" variant="ghost" onClick={() => setParams({ tab: 'settings' })}>
            {translate('card.edit')}
            <ChevronRight aria-hidden className="size-4" />
          </Button>
        ) : null}
      </div>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex items-center gap-4">
          <ServiceLogo name={subscription.name} className="size-12" />
          <div className="flex min-w-0 flex-col gap-1">
            <Amount minor={price.amountMinor} currency={price.currency} size="l" />
            <span className="flex flex-wrap items-center gap-2 text-caption text-text-secondary">
              {translate('interval', {
                unit: subscription.unit,
                count: subscription.count,
              })}
              {' · '}
              {nextOn ? translate('next', { date: dateLabel(nextOn) }) : translate('noNext')}
              <SubscriptionState subscription={subscription} />
            </span>
          </div>
        </div>
        {subscription.archivedAt ? null : (
          <div className="flex flex-col gap-2">
            <span className="text-caption text-text-secondary">{translate('verdict.label')}</span>
            <VerdictControl subscription={subscription} />
          </div>
        )}
      </div>
    </section>
  )
}

const PANELS: Record<CardTab, (props: { subscriptionId: string }) => React.ReactNode> = {
  overview: SubscriptionOverview,
  history: SubscriptionHistory,
  settings: SubscriptionSettings,
}

type SubscriptionCardProps = {
  subscriptionId: string
}

// The card is the ?sub=<id>&tab= state of the subscriptions page: Overview / History / Settings (§8). A viewer has no
// Settings tab (nothing there is read-only).
export function SubscriptionCard({ subscriptionId }: SubscriptionCardProps) {
  const translate = useTranslations('subscriptions.card')
  const canWrite = useCanWrite()
  const query = useSubscription(subscriptionId)
  const subscription = query.data
  const { failedLoad, retry } = useScreenQueryState([query], translate('refreshFailed'))
  const { tab, setParams, closeCard } = useSubscriptionParams()
  const tabs = CARD_TABS.filter((value) => canWrite || value !== 'settings')
  const current = tabs.includes(tab) ? tab : 'overview'

  const back = (
    <Button variant="ghost" size="s" className="self-start" onClick={closeCard}>
      <ChevronLeft aria-hidden className="size-4" />
      {translate('back')}
    </Button>
  )

  if (failedLoad) {
    return (
      <>
        {back}
        <ErrorState title={translate('loadFailed')} onRetryAction={retry} />
      </>
    )
  }

  if (subscription === undefined) {
    return <Bone className="h-96 rounded-card" />
  }

  if (!subscription) {
    return (
      <>
        {back}
        <p role="alert" className="text-body text-text-secondary">
          {translate('notFound')}
        </p>
      </>
    )
  }

  return (
    <>
      {back}
      <SubscriptionHeader subscription={subscription} />
      <Tabs
        label={translate('tabs.label')}
        value={current}
        onValueChange={(value: CardTab) => setParams({ tab: value })}
        options={tabs.map((value) => {
          const Panel = PANELS[value]

          return {
            value,
            label: translate(`tabs.${value}`),
            panel: <Panel subscriptionId={subscription.id} />,
          }
        })}
      />
    </>
  )
}
