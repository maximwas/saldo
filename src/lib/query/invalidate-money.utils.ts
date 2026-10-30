import type { QueryClient } from '@tanstack/react-query'
import { MONEY_QUERY_ROOTS } from '@/constants/query-roots.constants'

const MONEY_ROOTS: readonly unknown[] = MONEY_QUERY_ROOTS

/** after any money write: refetch this space's money views (Overview, accounts, categories …), never another space's */
export const invalidateMoney = (queryClient: QueryClient, ledgerId: string) =>
  queryClient.invalidateQueries({
    predicate: ({ queryKey }) => queryKey[1] === ledgerId && MONEY_ROOTS.includes(queryKey[0]),
  })
