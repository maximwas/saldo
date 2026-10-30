import { queryOptions } from '@tanstack/react-query'
import { ledgerQueryKey } from '@/lib/query/query-keys.utils'
import { getBrowserSupabase } from '@/lib/supabase/browser-client'
import { countAccountOperations, getAccounts } from './accounts.api'

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
  operationCount: (ledgerId: string, accountId: string) =>
    queryOptions({
      queryKey: ledgerQueryKey('accounts', ledgerId, 'operation-count', accountId),
      queryFn: () =>
        countAccountOperations(getBrowserSupabase(), {
          ledgerId,
          accountId,
        }),
    }),
}
