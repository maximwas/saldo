import { queryOptions } from '@tanstack/react-query'
import { ledgerQueryKey } from '@/lib/query/query-keys.utils'
import { getBrowserSupabase } from '@/lib/supabase/browser-client'
import {
  listCandidateOperations,
  listObligationOptions,
  listObligationPayments,
  listObligations,
} from './obligations.api'

export const obligationQueries = {
  list: (ledgerId: string) =>
    queryOptions({
      queryKey: ledgerQueryKey('obligations', ledgerId, 'list'),
      queryFn: () => listObligations(getBrowserSupabase(), ledgerId),
    }),
  options: (ledgerId: string) =>
    queryOptions({
      queryKey: ledgerQueryKey('obligations', ledgerId, 'options'),
      queryFn: () => listObligationOptions(getBrowserSupabase(), ledgerId),
    }),
  candidates: (ledgerId: string, direction: 'in' | 'out') =>
    queryOptions({
      queryKey: ledgerQueryKey('obligations', ledgerId, 'candidates', direction),
      queryFn: () =>
        listCandidateOperations(getBrowserSupabase(), {
          ledgerId,
          direction,
        }),
    }),
  payments: (ledgerId: string, obligationId: string) =>
    queryOptions({
      queryKey: ledgerQueryKey('obligations', ledgerId, 'payments', obligationId),
      queryFn: () => listObligationPayments(getBrowserSupabase(), obligationId),
    }),
}
