'use client'

import { useSubscriptionParams } from '../hooks/subscription-params.hook'
import { SubscriptionCard } from './subscription-card.component'
import { SubscriptionList } from './subscription-list.component'

// Payments → Subscriptions (§8): the list, or a card when the URL names one (?sub=<id>)
export function SubscriptionsScreen() {
  const { sub } = useSubscriptionParams()

  return sub ? <SubscriptionCard key={sub} subscriptionId={sub} /> : <SubscriptionList />
}
