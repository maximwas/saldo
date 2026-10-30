import { z } from 'zod'
import { adjustmentHasNote, kindMatchesDirection, operationRowSchema } from './create-operation-input.schema'

/** update_operation(p_id, p_expected_version, p_patch): the patch holds only the columns that change */
export const updateOperationInputSchema = z.object({
  id: z.uuid(),
  expectedVersion: z.int().nonnegative(),
  patch: operationRowSchema
    .omit({
      id: true,
      ledger_id: true,
    })
    .partial()
    .refine(kindMatchesDirection, {
      path: ['direction'],
      message: 'kindDirection',
    })
    .refine(adjustmentHasNote, {
      path: ['note'],
      message: 'adjustmentNote',
    }),
})

export type UpdateOperationInput = z.infer<typeof updateOperationInputSchema>
