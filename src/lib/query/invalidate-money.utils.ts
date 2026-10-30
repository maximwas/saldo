import type { QueryClient } from '@tanstack/react-query'
import { isMoneyQuery } from '@/constants/query-roots.constants'

/** after any money write: refetch this space's money views (Overview, accounts, categories …), never another space's */
export const invalidateMoney = (queryClient: QueryClient, ledgerId: string) =>
  queryClient.invalidateQueries({
    predicate: (query) => query.queryKey[1] === ledgerId && isMoneyQuery(query),
  })
