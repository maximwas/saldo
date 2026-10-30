'use client'

import { useTranslations } from 'next-intl'
import { Amount } from '@/components/ui/amount.component'
import { Badge } from '@/components/ui/badge.component'
import { SegmentedControl } from '@/components/ui/segmented-control.component'
import { ServiceLogo } from '@/components/ui/service-logo.component'
import { useToday } from '@/contexts/clock.context'
import { useCanWrite } from '@/contexts/ledger.context'
import type { SubscriptionView } from '../api/subscriptions.api'
import { useDateLabel } from '../hooks/date-label.hook'
import { useSubscriptionParams } from '../hooks/subscription-params.hook'
import { useSubscriptionOptions, useUpdateSubscription } from '../hooks/subscriptions.hook'
import { toVerdictInput } from '../schemas/subscription-form.schema'
import { nextPaymentOn, SUBSCRIPTION_VERDICTS, shownPrice } from '../utils/subscription-series.utils'

// a StatusPill Kind per state (badge.component): Active → positive, Trial → info, Paused → neutral, Cancelled and
// Archive → muted; the intent to cancel is the amber «not done yet»
const STATUS_TONE = {
  trial: 'info',
  active: 'positive',
  paused: 'neutral',
  cancel_intended: 'warning',
  cancelled: 'muted',
} as const

type SubscriptionStateProps = {
  subscription: SubscriptionView
}

/** the state pill: archived wins over the status (removed from tracking ≠ cancelled, §8) */
export function SubscriptionState({ subscription }: SubscriptionStateProps) {
  const translate = useTranslations('subscriptions.status')

  if (subscription.archivedAt) {
    return <Badge tone="muted">{translate('archived')}</Badge>
  }

  return <Badge tone={STATUS_TONE[subscription.status]}>{translate(subscription.status)}</Badge>
}

/** «keep / review / cancel»: a viewer sees the verdict, an editor sets it */
export function VerdictControl({ subscription }: SubscriptionStateProps) {
  const translate = useTranslations('subscriptions.verdict')
  const canWrite = useCanWrite()
  const update = useUpdateSubscription()

  if (!canWrite) {
    return subscription.verdict ? <Badge tone="neutral">{translate(subscription.verdict)}</Badge> : null
  }

  return (
    <SegmentedControl
      label={translate('label')}
      value={subscription.verdict ?? undefined}
      pending={update.isPending}
      stretch
      onValueChange={(verdict) => update.mutate(toVerdictInput(subscription, verdict))}
      options={SUBSCRIPTION_VERDICTS.map((verdict) => ({
        value: verdict,
        label: translate(verdict),
      }))}
    />
  )
}

type SubscriptionRowProps = {
  subscription: SubscriptionView
}

// Figma «Saldo» → Subscriptions 2:17361 / 2:17618 (ListItem): logo, name, «period · account» + state, the next payment's
// amount and date on the right, the assessment beside it (under the row on mobile). The row opens the card.
export function SubscriptionRow({ subscription }: SubscriptionRowProps) {
  const translate = useTranslations('subscriptions')
  const today = useToday()
  const dateLabel = useDateLabel()
  const { openCard } = useSubscriptionParams()
  const options = useSubscriptionOptions()
  const accountName = options.data?.accounts.find((account) => account.id === subscription.accountId)?.name
  const nextOn = nextPaymentOn(subscription, today)
  const price = shownPrice(subscription, today)

  return (
    <li className="flex flex-col gap-3 border-border border-b py-4 last:border-b-0 lg:flex-row lg:items-center lg:gap-6">
      <button
        type="button"
        onClick={() => openCard(subscription.id)}
        className="flex min-w-0 flex-1 cursor-pointer items-center gap-4 rounded-xs text-left outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <ServiceLogo name={subscription.name} />
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="truncate text-body font-medium text-text-primary">{subscription.name}</span>
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-caption text-text-secondary">
            <span>
              {translate('interval', {
                unit: subscription.unit,
                count: subscription.count,
              })}
              {accountName ? ` · ${accountName}` : ''}
            </span>
            <SubscriptionState subscription={subscription} />
          </span>
        </span>
        <span className="flex shrink-0 flex-col items-end gap-1">
          <Amount minor={price.amountMinor} currency={price.currency} />
          <span className="text-caption text-text-secondary">
            {nextOn ? translate('next', { date: dateLabel(nextOn) }) : translate('noNext')}
          </span>
        </span>
      </button>
      {subscription.archivedAt ? null : <VerdictControl subscription={subscription} />}
    </li>
  )
}
