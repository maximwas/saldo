import { queryOptions } from '@tanstack/react-query'
import { ledgerQueryKey } from '@/lib/query/query-keys.utils'
import { getBrowserSupabase } from '@/lib/supabase/browser-client'
import { listDebtAccounts, listDebts, listPurchases } from './debts.api'

export const debtQueries = {
  list: (ledgerId: string) =>
    queryOptions({
      queryKey: ledgerQueryKey('debts', ledgerId, 'list'),
      queryFn: () => listDebts(getBrowserSupabase(), ledgerId),
    }),
  accounts: (ledgerId: string) =>
    queryOptions({
      queryKey: ledgerQueryKey('debts', ledgerId, 'accounts'),
      queryFn: () => listDebtAccounts(getBrowserSupabase(), ledgerId),
    }),
  purchases: (ledgerId: string) =>
    queryOptions({
      queryKey: ledgerQueryKey('debts', ledgerId, 'purchases'),
      queryFn: () => listPurchases(getBrowserSupabase(), ledgerId),
    }),
}
