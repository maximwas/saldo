import { z } from 'zod'
import { debtOperationSchema } from './debt-operation.schema'

/** arguments of add_debt_movement: a repayment, with an operation when the money moves now */
export const addDebtMovementInputSchema = z.object({
  movement: z.object({
    id: z.uuid(),
    debt_id: z.uuid(),
    amount_minor: z.int().positive(),
    occurred_on: z.iso.date(),
  }),
  operation: debtOperationSchema.nullable(),
})

export type AddDebtMovementInput = z.infer<typeof addDebtMovementInputSchema>
