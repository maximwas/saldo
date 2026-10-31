import { useLedgerStore } from '@/contexts/ledger.context'
import { dropReceipt, keepReceipt, readReceipt } from '@/lib/offline/device-storage'
import { defineWrites } from '@/lib/query/ledger-writes.mutations'
import { useLedgerWrite } from '@/lib/query/use-ledger-write.hook'
import type { SaldoClient } from '@/types/supabase.types'
import { compressReceipt } from '../utils/receipt-compress.utils'
import {
  createOperation,
  createTransfer,
  deleteOperation,
  deleteReceipt,
  updateOperation,
  uploadReceipt,
} from './operations.api'

type KeptReceipt = {
  ledgerId: string
  operationId: string
}

/** the queued upload of a photo kept on the device: nothing kept means an earlier try already uploaded it */
async function uploadKeptReceipt(client: SaldoClient, { ledgerId, operationId }: KeptReceipt) {
  const file = await readReceipt(operationId)

  if (!file) {
    return
  }

  await uploadReceipt(client, {
    ledgerId,
    operationId,
    file,
  })
  await dropReceipt(operationId)
}

/** this feature's writes in the device's queue; AppProviders registers them before the cache is restored */
export const operationsWrites = defineWrites('operations', {
  createOperation,
  updateOperation,
  deleteOperation,
  createTransfer,
  uploadKeptReceipt,
  deleteReceipt,
})

// the editor shows a failed save inline (the conflict block, the error line): no toast on top
const INLINE = {
  quiet: true,
}

export const useCreateOperation = () => useLedgerWrite(operationsWrites.createOperation, INLINE)

export const useUpdateOperation = () => useLedgerWrite(operationsWrites.updateOperation, INLINE)

export const useDeleteOperation = () => useLedgerWrite(operationsWrites.deleteOperation, INLINE)

export const useCreateTransfer = () => useLedgerWrite(operationsWrites.createTransfer, INLINE)

export const useDeleteReceipt = () => useLedgerWrite(operationsWrites.deleteReceipt)

type UploadParams = {
  operationId: string
  file: File
}

/** compress in the browser and keep the photo on the device, then queue its upload after the operation (plan 8.5) */
export function useUploadReceipt() {
  const ledgerId = useLedgerStore((ledger) => ledger.ledgerId)
  const upload = useLedgerWrite(operationsWrites.uploadKeptReceipt, INLINE)

  return {
    mutateAsync: async ({ operationId, file }: UploadParams) => {
      await keepReceipt(operationId, await compressReceipt(file))

      return upload.mutateAsync({
        ledgerId,
        operationId,
      })
    },
  }
}
