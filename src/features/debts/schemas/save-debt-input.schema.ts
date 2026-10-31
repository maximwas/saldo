import { z } from 'zod'
import { CURRENCIES } from '@/constants/currencies.constants'
import { debtOperationSchema } from './debt-operation.schema'

const createDebtSchema = z.object({
  id: z.uuid(),
  ledger_id: z.uuid(),
  direction: z.enum(['owed_to_me', 'i_owe']),
  person: z.string().min(1).max(80),
  reason: z.string().max(200).nullable(),
  principal_minor: z.int().positive(),
  currency: z.enum(CURRENCIES),
  arisen_on: z.iso.date(),
  account_id: z.uuid().nullable(),
  due_on: z.iso.date().nullable(),
  origin: z.enum(['new_movement', 'existing_no_movement', 'purchase_share']),
  share_of_operation_id: z.uuid().nullable(),
  note: z.string().max(500).nullable(),
})

/** an edit changes person, reason, account, due date, status and note only; amounts move through movements */
const editDebtSchema = z.object({
  id: z.uuid(),
  ledger_id: z.uuid(),
  version: z.int().nonnegative(),
  person: z.string().min(1).max(80).optional(),
  reason: z.string().max(200).nullable().optional(),
  account_id: z.uuid().nullable().optional(),
  due_on: z.iso.date().nullable().optional(),
  status: z.enum(['open', 'settled', 'written_off']).optional(),
  note: z.string().max(500).nullable().optional(),
})

/** arguments of save_debt: create without `version` (an operation only for origin new_movement), edit with it */
export const saveDebtInputSchema = z
  .object({
    debt: z.union([createDebtSchema, editDebtSchema]),
    operation: debtOperationSchema.nullable(),
  })
  .refine(
    (input) => !('origin' in input.debt) || (input.debt.origin === 'new_movement') === (input.operation !== null),
    {
      path: ['operation'],
      message: 'oneOperationSource',
    },
  )

export type SaveDebtInput = z.infer<typeof saveDebtInputSchema>
