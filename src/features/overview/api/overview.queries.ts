import { queryOptions } from '@tanstack/react-query'
import { ledgerQueryKey } from '@/lib/query/query-keys.utils'
import { getBrowserSupabase } from '@/lib/supabase/browser-client'
import { getOverview } from './overview.api'

type OverviewQueryParams = {
  ledgerId: string
  timeZone: string
  /** ledger-local date: the key changes at midnight, so "Available" is refetched on a new day */
  today: string
}

export const overviewQueries = {
  detail: ({ ledgerId, timeZone, today }: OverviewQueryParams) =>
    queryOptions({
      queryKey: ledgerQueryKey('overview', ledgerId, 'detail', today),
      queryFn: () =>
        getOverview(getBrowserSupabase(), {
          ledgerId,
          timeZone,
          now: new Date(),
        }),
    }),
}
