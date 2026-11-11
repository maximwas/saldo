'use client'

import { useTranslations } from 'next-intl'
import { Amount } from '@/components/ui/amount.component'
import { Badge } from '@/components/ui/badge.component'
import { useRipple } from '@/components/ui/ripple.hook'
import { SegmentedControl } from '@/components/ui/segmented-control.component'
import { ServiceLogo } from '@/components/ui/service-logo.component'
import { notify, type ToastAction } from '@/components/ui/toaster.component'
import { useToday } from '@/contexts/clock.context'
import { useCanWrite } from '@/contexts/ledger.context'
import { useDayText } from '@/lib/dates/day-text.hook'
import type { SubscriptionView } from '../api/subscriptions.api'
import { useSubscriptionParams } from '../hooks/subscription-params.hook'
import { useSubscriptionOptions, useUpdateSubscription } from '../hooks/subscriptions.hook'
import { toVerdictInput } from '../schemas/subscription-form.schema'
import {
  nextPaymentOn,
  SUBSCRIPTION_VERDICTS,
  type SubscriptionVerdict,
  shownPrice,
} from '../utils/subscription-series.utils'

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

type VerdictControlProps = SubscriptionStateProps & {
  /** the card also says what the mark does; a list row only asks the question */
  explained?: boolean
}

/** «do you need it?» yes / not sure / no: a viewer sees the mark, an editor sets it and a toast says what changed and where */
export function VerdictControl({ subscription, explained = false }: VerdictControlProps) {
  const translate = useTranslations('subscriptions.verdict')
  const canWrite = useCanWrite()
  const update = useUpdateSubscription()
  const { sub, setParams, openCard } = useSubscriptionParams()

  if (!canWrite) {
    return subscription.verdict ? <Badge tone="neutral">{translate(subscription.verdict)}</Badge> : null
  }

  // «not sure» leads to its filter; «not needed» from the list leads to the card, where the real cancel is
  const actions: Partial<Record<SubscriptionVerdict, ToastAction>> = {
    review: {
      label: translate('showReview'),
      onAction: () =>
        setParams({
          state: 'review',
          sub: null,
          tab: null,
        }),
    },
    cancel: sub
      ? undefined
      : {
          label: translate('openCard'),
          onAction: () => openCard(subscription.id),
        },
  }

  // on the card the real cancel is on the same page, so the toast points there instead of «open the card»
  const doneText = (verdict: SubscriptionVerdict) =>
    verdict === 'cancel' && sub
      ? translate('doneCancelHere', { name: subscription.name })
      : translate(`done.${verdict}`, { name: subscription.name })
  const choose = (verdict: SubscriptionVerdict) =>
    update.mutate(toVerdictInput(subscription, verdict), {
      onSuccess: () => notify.success(doneText(verdict), actions[verdict]),
    })

  return (
    <div className="flex shrink-0 flex-col gap-2">
      <span aria-hidden className="text-caption text-text-secondary">
        {translate('label')}
      </span>
      <SegmentedControl
        label={translate('label')}
        value={subscription.verdict ?? undefined}
        pending={update.isPending}
        stretch
        onValueChange={choose}
        options={SUBSCRIPTION_VERDICTS.map((verdict) => ({
          value: verdict,
          label: translate(`options.${verdict}`),
        }))}
      />
      {explained ? <p className="text-caption text-text-secondary lg:max-w-xs">{translate('hint')}</p> : null}
    </div>
  )
}

type SubscriptionRowProps = {
  subscription: SubscriptionView
}

// Figma «Saldo» → Subscriptions 2:17361 / 2:17618 (ListItem): logo, name, «period · account» + state, the next payment's
// amount and date on the right, the «do you need it» mark beside it (under the row on mobile). The row opens the card.
export function SubscriptionRow({ subscription }: SubscriptionRowProps) {
  const translate = useTranslations('subscriptions')
  const today = useToday()
  const dayText = useDayText()
  const { pressProps, ripple } = useRipple()
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
        {...pressProps}
        className="relative -mx-3 -my-3 flex min-w-0 flex-1 cursor-pointer items-start gap-4 overflow-hidden rounded-md px-3 py-3 text-left outline-none transition-colors hover:bg-subtle focus-visible:ring-2 focus-visible:ring-primary"
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
            {nextOn ? translate('next', { date: dayText(nextOn, 'short') }) : translate('noNext')}
          </span>
        </span>
        {ripple}
      </button>
      {subscription.archivedAt ? null : <VerdictControl subscription={subscription} />}
    </li>
  )
}
