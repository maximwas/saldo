import { useQuery } from '@tanstack/react-query'
import { useLedger } from '@/contexts/ledger.context'
import { defineWrites } from '@/lib/query/ledger-writes.mutations'
import { useLedgerWrite } from '@/lib/query/use-ledger-write.hook'
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

/** this feature's writes in the device's queue; AppProviders registers them before the cache is restored */
export const obligationsWrites = defineWrites('obligations', {
  createObligation,
  updateObligation,
  payObligation,
  deleteObligationPayment,
})

// every sheet of the feature shows a failed write itself (per-call onError: «already paid» for PT409 …)
const PER_CALL = {
  quiet: true,
}

export const useCreateObligation = () => useLedgerWrite(obligationsWrites.createObligation, PER_CALL)

export const useUpdateObligation = () => useLedgerWrite(obligationsWrites.updateObligation, PER_CALL)

export const usePayObligation = () => useLedgerWrite(obligationsWrites.payObligation, PER_CALL)

export const useDeleteObligationPayment = () => useLedgerWrite(obligationsWrites.deleteObligationPayment, PER_CALL)
