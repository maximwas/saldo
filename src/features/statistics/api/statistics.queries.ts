import { queryOptions } from '@tanstack/react-query'
import { listCategoryOptions } from '@/lib/finance/ledger-options.api'
import { ledgerQueryKey } from '@/lib/query/query-keys.utils'
import { getBrowserSupabase } from '@/lib/supabase/browser-client'
import {
  getBudget,
  getByCategory,
  getCashflow,
  getCredits,
  getForecast,
  getSubscriptions,
  type StatsParams,
} from './statistics.api'

// root «statistics» is in MONEY_QUERY_ROOTS: any money write refetches the figures
const key = (name: string, { ledgerId, from, to, bucket, createdBy }: StatsParams) =>
  ledgerQueryKey('statistics', ledgerId, name, from, to, bucket, createdBy)

export const statisticsQueries = {
  cashflow: (params: StatsParams) =>
    queryOptions({
      queryKey: key('cashflow', params),
      queryFn: () => getCashflow(getBrowserSupabase(), params),
    }),
  byCategory: (params: StatsParams) =>
    queryOptions({
      queryKey: key('by-category', params),
      queryFn: () => getByCategory(getBrowserSupabase(), params),
    }),
  budget: (params: StatsParams) =>
    queryOptions({
      queryKey: key('budget', params),
      queryFn: () => getBudget(getBrowserSupabase(), params),
    }),
  subscriptions: (params: StatsParams) =>
    queryOptions({
      queryKey: key('subscriptions', params),
      queryFn: () => getSubscriptions(getBrowserSupabase(), params),
    }),
  credits: (params: StatsParams) =>
    queryOptions({
      queryKey: key('credits', params),
      queryFn: () => getCredits(getBrowserSupabase(), params),
    }),
  forecast: (params: StatsParams) =>
    queryOptions({
      queryKey: key('forecast', params),
      queryFn: () => getForecast(getBrowserSupabase(), params),
    }),
  categories: (ledgerId: string) =>
    queryOptions({
      queryKey: ledgerQueryKey('statistics', ledgerId, 'categories'),
      queryFn: () => listCategoryOptions(getBrowserSupabase(), ledgerId),
    }),
}
