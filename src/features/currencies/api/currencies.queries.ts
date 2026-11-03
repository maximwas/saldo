import { queryOptions } from '@tanstack/react-query'
import { getLedgerFx } from '@/lib/finance/ledger-fx.api'
import { ledgerQueryKey } from '@/lib/query/query-keys.utils'
import { getBrowserSupabase } from '@/lib/supabase/browser-client'
import { getMyPinnedCurrencies } from './currencies.api'

// [root, ledgerId, …]: root «currencies» is in MONEY_QUERY_ROOTS, so a saved rate refetches the lists that convert
export const currenciesQueries = {
  // every currency: the rates views list each NBU one, the account pairs among them
  rates: (ledgerId: string) =>
    queryOptions({
      queryKey: ledgerQueryKey('currencies', ledgerId, 'rates'),
      queryFn: () => getLedgerFx(getBrowserSupabase(), ledgerId, null),
    }),
  // the member's own row, not a money view: a write refetches it itself
  pinned: (ledgerId: string) =>
    queryOptions({
      queryKey: ledgerQueryKey('ledger-members', ledgerId, 'my-pinned-currencies'),
      queryFn: () => getMyPinnedCurrencies(getBrowserSupabase(), ledgerId),
    }),
}
