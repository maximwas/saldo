import { queryOptions } from '@tanstack/react-query'
import { ledgerQueryKey } from '@/lib/query/query-keys.utils'
import { getBrowserSupabase } from '@/lib/supabase/browser-client'
import type { OperationFilters } from '../operations.types'
import {
  getFormOptions,
  getPlannedToMonthEnd,
  listOperationSources,
  listOperations,
  listReceipts,
  listRefundLinks,
  listUpcomingPlans,
} from './operations.api'

type PlannedLedger = {
  ledgerId: string
  baseCurrency: string
  timeZone: string
}

// [«operations», ledgerId, …]: the root is in MONEY_QUERY_ROOTS, so any money write refreshes these too
export const operationQueries = {
  list: (ledgerId: string, filters: OperationFilters) =>
    queryOptions({
      queryKey: ledgerQueryKey('operations', ledgerId, 'list', filters),
      queryFn: () =>
        listOperations(getBrowserSupabase(), {
          ledgerId,
          filters,
        }),
    }),
  /** keyed by the ledger-local day, so a new day reads the plans again */
  planned: (ledger: PlannedLedger, today: string) =>
    queryOptions({
      queryKey: ledgerQueryKey('operations', ledger.ledgerId, 'planned', today),
      queryFn: () =>
        getPlannedToMonthEnd(getBrowserSupabase(), {
          ...ledger,
          now: new Date(),
        }),
    }),
  /** the «Planned» group: keyed by the ledger-local day like `planned` */
  upcoming: (ledgerId: string, today: string) =>
    queryOptions({
      queryKey: ledgerQueryKey('operations', ledgerId, 'upcoming', today),
      queryFn: () =>
        listUpcomingPlans(getBrowserSupabase(), {
          ledgerId,
          today,
        }),
    }),
  options: (ledgerId: string) =>
    queryOptions({
      queryKey: ledgerQueryKey('operations', ledgerId, 'options'),
      queryFn: () => getFormOptions(getBrowserSupabase(), ledgerId),
    }),
  refunds: (ledgerId: string) =>
    queryOptions({
      queryKey: ledgerQueryKey('operations', ledgerId, 'refunds'),
      queryFn: () => listRefundLinks(getBrowserSupabase(), ledgerId),
    }),
  sources: (ledgerId: string, operationId: string) =>
    queryOptions({
      queryKey: ledgerQueryKey('operations', ledgerId, 'sources', operationId),
      queryFn: () => listOperationSources(getBrowserSupabase(), operationId),
    }),
  // signed URLs live 5 minutes: the cache is dropped a minute earlier
  receipts: (ledgerId: string, operationId: string) =>
    queryOptions({
      queryKey: ledgerQueryKey('operations', ledgerId, 'receipts', operationId),
      queryFn: () => listReceipts(getBrowserSupabase(), operationId),
      staleTime: 60_000,
      gcTime: 240_000,
    }),
}
