import { queryOptions } from '@tanstack/react-query'
import { ledgerQueryKey } from '@/lib/query/query-keys.utils'
import { getBrowserSupabase } from '@/lib/supabase/browser-client'
import { countCategoryOperations, getCategories } from './categories.api'

// [root, ledgerId, …]: root «categories» is in MONEY_QUERY_ROOTS, so every money write refetches it
export const categoriesQueries = {
  list: (ledgerId: string) =>
    queryOptions({
      queryKey: ledgerQueryKey('categories', ledgerId, 'list'),
      queryFn: () => getCategories(getBrowserSupabase(), ledgerId),
    }),
  operationCount: (ledgerId: string, categoryIds: string[]) =>
    queryOptions({
      queryKey: ledgerQueryKey('categories', ledgerId, 'operation-count', ...categoryIds),
      queryFn: () =>
        countCategoryOperations(getBrowserSupabase(), {
          ledgerId,
          categoryIds,
        }),
    }),
}
