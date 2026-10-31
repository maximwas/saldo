import { queryOptions } from '@tanstack/react-query'
import { ledgerQueryKey } from '@/lib/query/query-keys.utils'
import { getBrowserSupabase } from '@/lib/supabase/browser-client'
import { getAccountActivity, getAccounts, getRecentTransfers } from './accounts.api'

type AccountsQueryParams = {
  ledgerId: string
  /** ledger-local date: the key changes at midnight, so the rates are picked again on a new day */
  today: string
}

// [root, ledgerId, …]: root «accounts» is in MONEY_QUERY_ROOTS, so every money write refetches it
export const accountsQueries = {
  list: ({ ledgerId, today }: AccountsQueryParams) =>
    queryOptions({
      queryKey: ledgerQueryKey('accounts', ledgerId, 'list', today),
      queryFn: () =>
        getAccounts(getBrowserSupabase(), {
          ledgerId,
          today,
        }),
    }),
  recentTransfers: (ledgerId: string) =>
    queryOptions({
      queryKey: ledgerQueryKey('accounts', ledgerId, 'recent-transfers'),
      queryFn: () => getRecentTransfers(getBrowserSupabase(), ledgerId, 3),
    }),
  activity: (ledgerId: string, accountId: string) =>
    queryOptions({
      queryKey: ledgerQueryKey('accounts', ledgerId, 'activity', accountId),
      queryFn: () =>
        getAccountActivity(getBrowserSupabase(), {
          ledgerId,
          accountId,
        }),
    }),
}
