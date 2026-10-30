import { queryOptions } from '@tanstack/react-query'
import { ledgerQueryKey } from '@/lib/query/query-keys.utils'
import { getBrowserSupabase } from '@/lib/supabase/browser-client'
import type { OperationFilters } from '../operations.types'
import { getFormOptions, listOperations, listReceipts } from './operations.api'

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
  options: (ledgerId: string) =>
    queryOptions({
      queryKey: ledgerQueryKey('operations', ledgerId, 'options'),
      queryFn: () => getFormOptions(getBrowserSupabase(), ledgerId),
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
