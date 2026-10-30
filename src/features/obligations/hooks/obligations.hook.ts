import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { isMoneyQuery } from '@/constants/query-roots.constants'
import { useLedger } from '@/contexts/ledger.context'
import { getBrowserSupabase } from '@/lib/supabase/browser-client'
import { createObligation, deleteObligationPayment, payObligation, updateObligation } from '../api/obligations.api'
import { obligationQueries } from '../api/obligations.queries'

export function useObligations() {
  return useQuery(obligationQueries.list(useLedger().ledgerId))
}

export function useObligationOptions() {
  return useQuery(obligationQueries.options(useLedger().ledgerId))
}

export function useCandidateOperations(direction: 'in' | 'out', enabled: boolean) {
  return useQuery({
    ...obligationQueries.candidates(useLedger().ledgerId, direction),
    enabled,
  })
}

export function useObligationPayments(obligationId: string, enabled: boolean) {
  return useQuery({
    ...obligationQueries.payments(useLedger().ledgerId, obligationId),
    enabled,
  })
}

/** a write changes balances, «Available», the month and the lists at once: every money view of the space refetches;
 * a failed write refetches too, so a conflict (PT409) shows the state the other person left */
function useMoneyMutation<Input>(write: (input: Input) => Promise<void>) {
  const queryClient = useQueryClient()
  const refresh = () => queryClient.invalidateQueries({ predicate: isMoneyQuery })

  return useMutation({
    mutationFn: write,
    onSettled: refresh,
  })
}

export const useCreateObligation = () =>
  useMoneyMutation((input: Parameters<typeof createObligation>[1]) => createObligation(getBrowserSupabase(), input))

export const useUpdateObligation = () =>
  useMoneyMutation((input: Parameters<typeof updateObligation>[1]) => updateObligation(getBrowserSupabase(), input))

export const usePayObligation = () =>
  useMoneyMutation((input: Parameters<typeof payObligation>[1]) => payObligation(getBrowserSupabase(), input))

export const useDeleteObligationPayment = () =>
  useMoneyMutation((input: Parameters<typeof deleteObligationPayment>[1]) =>
    deleteObligationPayment(getBrowserSupabase(), input),
  )
