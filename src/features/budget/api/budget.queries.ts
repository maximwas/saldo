import { queryOptions } from '@tanstack/react-query'
import { ledgerQueryKey } from '@/lib/query/query-keys.utils'
import { getBrowserSupabase } from '@/lib/supabase/browser-client'
import { getBudgetCategories, getBudgetMonth } from './budget.api'

// [root, ledgerId, …]: root «budget» is in MONEY_QUERY_ROOTS, so every money write refetches it
export const budgetQueries = {
  month: (ledgerId: string, month: string) =>
    queryOptions({
      queryKey: ledgerQueryKey('budget', ledgerId, 'month', month),
      queryFn: () =>
        getBudgetMonth(getBrowserSupabase(), {
          ledgerId,
          month,
        }),
    }),
  categories: (ledgerId: string) =>
    queryOptions({
      queryKey: ledgerQueryKey('budget', ledgerId, 'categories'),
      queryFn: () => getBudgetCategories(getBrowserSupabase(), ledgerId),
    }),
}
