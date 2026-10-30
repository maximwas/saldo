import { queryOptions } from '@tanstack/react-query'
import { getBrowserSupabase } from '@/lib/supabase/browser-client'
import { getOverview } from './overview.api'

type OverviewQueryParams = {
  ledgerId: string
  timeZone: string
  /** ledger-local date: the key changes at midnight, so "Available" is refetched on a new day */
  today: string
}

// [root, ledgerId, …]: root «overview» is in MONEY_QUERY_ROOTS, the cache of two spaces never mixes
const overviewKeys = {
  all: (ledgerId: string) => ['overview', ledgerId] as const,
  detail: (ledgerId: string, today: string) => [...overviewKeys.all(ledgerId), 'detail', today] as const,
}

export const overviewQueries = {
  detail: ({ ledgerId, timeZone, today }: OverviewQueryParams) =>
    queryOptions({
      queryKey: overviewKeys.detail(ledgerId, today),
      queryFn: () =>
        getOverview(getBrowserSupabase(), {
          ledgerId,
          timeZone,
          now: new Date(),
        }),
    }),
}
