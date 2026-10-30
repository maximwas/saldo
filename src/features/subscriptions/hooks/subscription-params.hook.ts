import { parseAsString, parseAsStringLiteral, useQueryStates } from 'nuqs'
import { SUBSCRIPTION_FILTERS } from '../utils/subscription-series.utils'

export const CARD_TABS = ['overview', 'history', 'settings'] as const
export type CardTab = (typeof CARD_TABS)[number]

const subscriptionParsers = {
  state: parseAsStringLiteral(SUBSCRIPTION_FILTERS).withDefault('all'),
  sub: parseAsString,
  tab: parseAsStringLiteral(CARD_TABS).withDefault('overview'),
}

/** ?state= filters the list, ?sub= opens a card on its ?tab=: a link or a reload lands on the same view */
export function useSubscriptionParams() {
  const [params, setParams] = useQueryStates(subscriptionParsers, { history: 'push' })

  return {
    ...params,
    setParams,
    openCard: (subscriptionId: string) =>
      setParams({
        sub: subscriptionId,
        tab: null,
      }),
    closeCard: () =>
      setParams({
        sub: null,
        tab: null,
      }),
  }
}
