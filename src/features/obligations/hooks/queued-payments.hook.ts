import { useMutationState } from '@tanstack/react-query'
import type { PayObligationInput } from '../schemas/pay-obligation-input.schema'
import { obligationsWrites } from './obligations.hook'

/** ids of the obligations whose «Paid» is still in the device's queue (not sent yet, e.g. offline): §22 «pending» */
export function useQueuedPayments(): ReadonlySet<string> {
  const ids = useMutationState({
    filters: {
      mutationKey: obligationsWrites.payObligation.key,
      status: 'pending',
    },
    select: (mutation) => (mutation.state.variables as PayObligationInput).obligationId,
  })

  return new Set(ids)
}
