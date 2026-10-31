import { z } from 'zod'
import { installmentInputSchema } from './save-credit-input.schema'

/** the new unpaid installments after an early payoff: the unpaid ones become `replaced`, the paid ones stay (§9) */
export const replaceCreditScheduleInputSchema = z.object({
  creditId: z.uuid(),
  expectedVersion: z.int().nonnegative(),
  installments: z.array(installmentInputSchema.extend({ id: z.uuid() })).min(1),
})

export type ReplaceCreditScheduleInput = z.input<typeof replaceCreditScheduleInputSchema>
