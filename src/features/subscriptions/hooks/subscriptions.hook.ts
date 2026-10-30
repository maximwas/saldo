import { useQuery } from '@tanstack/react-query'
import { useLedgerStore } from '@/contexts/ledger.context'
import { useLedgerWrite } from '@/lib/query/use-ledger-write.hook'
import {
  createSubscription,
  setSubscriptionDefaults,
  setSubscriptionPrice,
  updateSubscription,
} from '../api/subscriptions.api'
import { subscriptionQueries } from '../api/subscriptions.queries'

const useLedgerId = () => useLedgerStore((ledger) => ledger.ledgerId)

export const useSubscriptions = () => useQuery(subscriptionQueries.list(useLedgerId()))

/** one subscription out of the list cache: the card and its tabs read it here instead of getting it as a prop */
export function useSubscription(subscriptionId: string) {
  return useQuery({
    ...subscriptionQueries.list(useLedgerId()),
    select: (subscriptions) => subscriptions.find((subscription) => subscription.id === subscriptionId) ?? null,
  })
}

export const useSubscriptionPayments = (subscriptionId: string) =>
  useQuery(subscriptionQueries.payments(useLedgerId(), subscriptionId))

export const useSubscriptionOptions = () => useQuery(subscriptionQueries.options(useLedgerId()))

export const useSubscriptionRates = () => useQuery(subscriptionQueries.rates(useLedgerId()))

export const useSubscriptionDefaults = () => useQuery(subscriptionQueries.defaults(useLedgerId()))

export const useCreateSubscription = () => useLedgerWrite(createSubscription)

export const useUpdateSubscription = () => useLedgerWrite(updateSubscription)

export const useSetSubscriptionPrice = () => useLedgerWrite(setSubscriptionPrice)

export const useSetSubscriptionDefaults = () => useLedgerWrite(setSubscriptionDefaults)
