import { queryOptions } from '@tanstack/react-query'
import { ledgerQueryKey } from '@/lib/query/query-keys.utils'
import { getBrowserSupabase } from '@/lib/supabase/browser-client'
import { searchEntities } from './search.api'

export const searchQueries = {
  entities: (ledgerId: string, query: string) =>
    queryOptions({
      queryKey: ledgerQueryKey('search', ledgerId, query),
      queryFn: () => searchEntities(getBrowserSupabase(), ledgerId, query),
    }),
}
