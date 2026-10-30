import { queryOptions } from '@tanstack/react-query'
import { ledgerQueryKey } from '@/lib/query/query-keys.utils'
import { getBrowserSupabase } from '@/lib/supabase/browser-client'
import { listCredits } from './credits.api'

// root «credits» is in MONEY_QUERY_ROOTS: paying an installment on /payments refetches the schedules
export const creditQueries = {
  list: (ledgerId: string) =>
    queryOptions({
      queryKey: ledgerQueryKey('credits', ledgerId, 'list'),
      queryFn: () => listCredits(getBrowserSupabase(), ledgerId),
    }),
}
