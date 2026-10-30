import { queryOptions } from '@tanstack/react-query'
import { getLedgerRates } from '@/lib/finance/ledger-fx.api'
import { ledgerQueryKey } from '@/lib/query/query-keys.utils'
import { getBrowserSupabase } from '@/lib/supabase/browser-client'
import {
  getSubscriptionDefaults,
  listSubscriptionOptions,
  listSubscriptionPayments,
  listSubscriptions,
} from './subscriptions.api'

// [root, ledgerId, …]: «subscriptions» is in MONEY_QUERY_ROOTS, so every money write refetches it
export const subscriptionQueries = {
  list: (ledgerId: string) =>
    queryOptions({
      queryKey: ledgerQueryKey('subscriptions', ledgerId, 'list'),
      queryFn: () => listSubscriptions(getBrowserSupabase(), ledgerId),
    }),
  payments: (ledgerId: string, subscriptionId: string) =>
    queryOptions({
      queryKey: ledgerQueryKey('subscriptions', ledgerId, 'payments', subscriptionId),
      queryFn: () => listSubscriptionPayments(getBrowserSupabase(), subscriptionId),
    }),
  options: (ledgerId: string) =>
    queryOptions({
      queryKey: ledgerQueryKey('subscriptions', ledgerId, 'options'),
      queryFn: () => listSubscriptionOptions(getBrowserSupabase(), ledgerId),
    }),
  rates: (ledgerId: string) =>
    queryOptions({
      queryKey: ledgerQueryKey('subscriptions', ledgerId, 'rates'),
      queryFn: () => getLedgerRates(getBrowserSupabase(), ledgerId),
    }),
  defaults: (ledgerId: string) =>
    queryOptions({
      queryKey: ledgerQueryKey('subscriptions', ledgerId, 'defaults'),
      queryFn: () => getSubscriptionDefaults(getBrowserSupabase(), ledgerId),
    }),
}
