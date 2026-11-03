import { queryOptions } from '@tanstack/react-query'
import { listCreditInstallments } from '@/lib/finance/credit-installments.api'
import { ledgerQueryKey } from '@/lib/query/query-keys.utils'
import { getBrowserSupabase } from '@/lib/supabase/browser-client'
import {
  type CalendarParams,
  listCalendarDayTotals,
  listCalendarEntries,
  listCalendarOptions,
  listPaidElsewhereDays,
  listSavedFilters,
} from './calendar.api'

export const calendarQueries = {
  entries: (params: CalendarParams) =>
    queryOptions({
      queryKey: ledgerQueryKey('calendar', params.ledgerId, 'entries', params.from, params.to, params.filter),
      queryFn: () => listCalendarEntries(getBrowserSupabase(), params),
    }),
  totals: (params: CalendarParams) =>
    queryOptions({
      queryKey: ledgerQueryKey('calendar', params.ledgerId, 'totals', params.from, params.to, params.filter),
      queryFn: () => listCalendarDayTotals(getBrowserSupabase(), params),
    }),
  paidElsewhereDays: (params: CalendarParams) =>
    queryOptions({
      queryKey: ledgerQueryKey('calendar', params.ledgerId, 'paid-elsewhere-days', params.from, params.to),
      queryFn: () => listPaidElsewhereDays(getBrowserSupabase(), params),
    }),
  installments: (ledgerId: string) =>
    queryOptions({
      queryKey: ledgerQueryKey('calendar', ledgerId, 'installments'),
      queryFn: () => listCreditInstallments(getBrowserSupabase(), ledgerId),
    }),
  saved: (ledgerId: string) =>
    queryOptions({
      queryKey: ledgerQueryKey('calendar', ledgerId, 'saved'),
      queryFn: () => listSavedFilters(getBrowserSupabase(), ledgerId),
    }),
  options: (ledgerId: string) =>
    queryOptions({
      queryKey: ledgerQueryKey('calendar', ledgerId, 'options'),
      queryFn: () => listCalendarOptions(getBrowserSupabase(), ledgerId),
    }),
}
