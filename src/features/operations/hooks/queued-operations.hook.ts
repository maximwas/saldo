import { type Mutation, useMutationState } from '@tanstack/react-query'
import { useMemo } from 'react'
import { useLedgerStore } from '@/contexts/ledger.context'
import type { CreateOperationInput } from '@/lib/finance/create-operation-input.schema'
import { type RecordState, recordState } from '@/lib/query/sync-queue.utils'
import { operationsWrites } from '../api/operations.mutations'
import type { OperationRow } from '../operations.types'

type QueuedOperation = {
  input: CreateOperationInput
  state: RecordState
}

const isWaiting = (mutation: Mutation) => mutation.state.status === 'pending' || mutation.state.status === 'error'

const toQueued = (mutation: Mutation): QueuedOperation => ({
  input: mutation.state.variables as CreateOperationInput,
  state: recordState(mutation.state),
})

/** a queued create as a list row: the server has not converted it yet, so a foreign currency has no base amount */
const toRow = (input: CreateOperationInput, baseCurrency: string): OperationRow => ({
  id: input.id,
  kind: input.kind,
  direction: input.direction,
  accountId: input.account_id,
  amountMinor: input.amount_minor,
  currency: input.currency,
  baseAmountMinor: input.currency === baseCurrency ? input.amount_minor : null,
  baseCurrency,
  categoryId: input.category_id,
  counterparty: input.counterparty,
  note: input.note,
  occurredAt: input.occurred_at,
  occurredOn: input.occurred_on,
  transferId: null,
  refundOfId: input.refund_of_id,
  version: 1,
  createdBy: null,
})

/** operations of this space still in the device's queue (pending, error, conflict), with their state by id (§22) */
export function useQueuedOperations() {
  const ledgerId = useLedgerStore((ledger) => ledger.ledgerId)
  const baseCurrency = useLedgerStore((ledger) => ledger.baseCurrency)
  const queued = useMutationState({
    filters: {
      mutationKey: operationsWrites.createOperation.key,
      predicate: isWaiting,
    },
    select: toQueued,
  })

  return useMemo(() => {
    const mine = queued.filter(({ input }) => input.ledger_id === ledgerId)

    return {
      rows: mine.map(({ input }) => toRow(input, baseCurrency)),
      states: new Map(mine.map(({ input, state }) => [input.id, state])),
    }
  }, [queued, ledgerId, baseCurrency])
}
