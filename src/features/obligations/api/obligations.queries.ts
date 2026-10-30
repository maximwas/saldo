import { queryOptions } from '@tanstack/react-query'
import { getBrowserSupabase } from '@/lib/supabase/browser-client'
import {
  listCandidateOperations,
  listObligationOptions,
  listObligationPayments,
  listObligations,
} from './obligations.api'

// [root, ledgerId, …]: root «obligations» is in MONEY_QUERY_ROOTS, the cache of two spaces never mixes
const keys = {
  all: (ledgerId: string) => ['obligations', ledgerId] as const,
}

export const obligationQueries = {
  list: (ledgerId: string) =>
    queryOptions({
      queryKey: [...keys.all(ledgerId), 'list'] as const,
      queryFn: () => listObligations(getBrowserSupabase(), ledgerId),
    }),
  options: (ledgerId: string) =>
    queryOptions({
      queryKey: [...keys.all(ledgerId), 'options'] as const,
      queryFn: () => listObligationOptions(getBrowserSupabase(), ledgerId),
    }),
  candidates: (ledgerId: string, direction: 'in' | 'out') =>
    queryOptions({
      queryKey: [...keys.all(ledgerId), 'candidates', direction] as const,
      queryFn: () =>
        listCandidateOperations(getBrowserSupabase(), {
          ledgerId,
          direction,
        }),
    }),
  payments: (ledgerId: string, obligationId: string) =>
    queryOptions({
      queryKey: [...keys.all(ledgerId), 'payments', obligationId] as const,
      queryFn: () => listObligationPayments(getBrowserSupabase(), obligationId),
    }),
}
