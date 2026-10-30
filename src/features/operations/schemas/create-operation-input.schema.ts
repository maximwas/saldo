import { z } from 'zod'
import { CURRENCIES } from '@/constants/currencies.constants'

/** kinds a person enters by hand; transfer_* and debt_* are written by their own RPCs */
export const OPERATION_KINDS = ['income', 'expense', 'refund', 'adjustment'] as const

const IN_KINDS = new Set(['income', 'refund'])

/** columns of public.operations as create_operation reads them from p_operation (jsonb_populate_record) */
export const operationRowSchema = z.object({
  id: z.uuid(),
  ledger_id: z.uuid(),
  kind: z.enum(OPERATION_KINDS),
  direction: z.enum(['in', 'out']),
  account_id: z.uuid(),
  amount_minor: z.int().positive(),
  currency: z.enum(CURRENCIES),
  occurred_at: z.iso.datetime({ offset: true }),
  occurred_on: z.iso.date(),
  category_id: z.uuid().nullable(),
  counterparty: z.string().max(200).nullable(),
  note: z.string().max(500).nullable(),
  refund_of_id: z.uuid().nullable(),
})

type OperationRowLike = {
  kind?: (typeof OPERATION_KINDS)[number]
  direction?: 'in' | 'out'
  note?: string | null
}

/** operations_kind_direction: income and refund come in, expense goes out, adjustment either way */
export const kindMatchesDirection = (row: OperationRowLike) =>
  row.kind === undefined || row.kind === 'adjustment' || row.direction === (IN_KINDS.has(row.kind) ? 'in' : 'out')

/** operations_adjustment_note: an adjustment is explained by a note (§5) */
export const adjustmentHasNote = (row: OperationRowLike) => row.kind !== 'adjustment' || Boolean(row.note?.trim())

/** p_operation of create_operation; amounts in minor units, the id comes from the client */
export const createOperationInputSchema = operationRowSchema
  .refine(kindMatchesDirection, {
    path: ['direction'],
    message: 'kindDirection',
  })
  .refine(adjustmentHasNote, {
    path: ['note'],
    message: 'adjustmentNote',
  })

export type CreateOperationInput = z.infer<typeof createOperationInputSchema>
