import { queryOptions } from '@tanstack/react-query'
import { getPlannedToMonthEnd } from '@/lib/finance/planned-to-month-end.api'
import { ledgerQueryKey } from '@/lib/query/query-keys.utils'
import { getBrowserSupabase } from '@/lib/supabase/browser-client'
import { getBudgetCategories, getBudgetMonth } from './budget.api'

type PlannedLedger = {
  ledgerId: string
  baseCurrency: string
  timeZone: string
}

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
  /** the result tile's «with plan to the month end»: keyed by the ledger-local day, so a new day reads the plans again */
  planned: (ledger: PlannedLedger, today: string) =>
    queryOptions({
      queryKey: ledgerQueryKey('budget', ledger.ledgerId, 'planned', today),
      queryFn: () =>
        getPlannedToMonthEnd(getBrowserSupabase(), {
          ...ledger,
          now: new Date(),
        }),
    }),
}
