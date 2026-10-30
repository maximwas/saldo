import { queryOptions } from '@tanstack/react-query'
import { getLedgerFx } from '@/lib/finance/ledger-fx.api'
import { ledgerQueryKey } from '@/lib/query/query-keys.utils'
import { getBrowserSupabase } from '@/lib/supabase/browser-client'

// [root, ledgerId, …]: root «currencies» is in MONEY_QUERY_ROOTS, so a saved rate refetches the lists that convert
export const currenciesQueries = {
  rates: (ledgerId: string) =>
    queryOptions({
      queryKey: ledgerQueryKey('currencies', ledgerId, 'rates'),
      queryFn: () => getLedgerFx(getBrowserSupabase(), ledgerId),
    }),
}
