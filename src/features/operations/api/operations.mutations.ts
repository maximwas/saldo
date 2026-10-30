import { useMutation, useQueryClient } from '@tanstack/react-query'
import { isLedgerMoneyQuery } from '@/constants/query-roots.constants'
import { useLedger } from '@/contexts/ledger.context'
import { getBrowserSupabase } from '@/lib/supabase/browser-client'
import { compressReceipt } from '../utils/receipt-compress.utils'
import {
  createOperation,
  createTransfer,
  deleteOperation,
  deleteReceipt,
  updateOperation,
  uploadReceipt,
} from './operations.api'

/** a write to money refreshes the money views of this space: Overview, operations, accounts … */
export function useInvalidateMoney() {
  const queryClient = useQueryClient()
  const { ledgerId } = useLedger()

  return () => queryClient.invalidateQueries({ predicate: isLedgerMoneyQuery(ledgerId) })
}

// shortcut: no offline queue and no optimistic row yet (phase 8: setMutationDefaults + IndexedDB, architecture §6)
export function useCreateOperation() {
  const invalidate = useInvalidateMoney()

  return useMutation({
    mutationFn: (input: Parameters<typeof createOperation>[1]) => createOperation(getBrowserSupabase(), input),
    onSettled: () => {
      void invalidate()
    },
  })
}

export function useUpdateOperation() {
  const invalidate = useInvalidateMoney()

  return useMutation({
    mutationFn: (input: Parameters<typeof updateOperation>[1]) => updateOperation(getBrowserSupabase(), input),
    onSettled: () => {
      void invalidate()
    },
  })
}

export function useDeleteOperation() {
  const invalidate = useInvalidateMoney()

  return useMutation({
    mutationFn: (input: Parameters<typeof deleteOperation>[1]) => deleteOperation(getBrowserSupabase(), input),
    onSettled: () => {
      void invalidate()
    },
  })
}

export function useCreateTransfer() {
  const invalidate = useInvalidateMoney()

  return useMutation({
    mutationFn: (input: Parameters<typeof createTransfer>[1]) => createTransfer(getBrowserSupabase(), input),
    onSettled: () => {
      void invalidate()
    },
  })
}

type UploadParams = {
  operationId: string
  file: File
}

/** compress in the browser, then upload; the list refreshes so the paperclip appears */
export function useUploadReceipt() {
  const invalidate = useInvalidateMoney()
  const { ledgerId } = useLedger()

  return useMutation({
    mutationFn: async ({ operationId, file }: UploadParams) =>
      uploadReceipt(getBrowserSupabase(), {
        ledgerId,
        operationId,
        file: await compressReceipt(file),
      }),
    onSettled: () => {
      void invalidate()
    },
  })
}

export function useDeleteReceipt() {
  const invalidate = useInvalidateMoney()

  return useMutation({
    mutationFn: (receipt: Parameters<typeof deleteReceipt>[1]) => deleteReceipt(getBrowserSupabase(), receipt),
    onSettled: () => {
      void invalidate()
    },
  })
}
