import { z } from 'zod'
import type { Payoff } from '../utils/credits.utils'
import type { ReplaceCreditScheduleInput } from './replace-credit-schedule-input.schema'

/** early payoff of the whole rest: the person confirms the date; the amount is what the schedule still expects */
export const earlyRepaymentFormSchema = z.object({
  payOn: z.iso.date('dateInvalid'),
})

export type EarlyRepaymentFormValues = z.infer<typeof earlyRepaymentFormSchema>

type EarlyRepaymentContext = {
  /** the id of the payoff installment: the «Paid» sheet opens on it next */
  id: string
  creditId: string
  version: number
  payoff: Payoff
}

/** the unpaid installments give way to one installment of the whole rest on the payoff date (§9: never guessed) */
export function toReplaceCreditScheduleInput(
  values: EarlyRepaymentFormValues,
  context: EarlyRepaymentContext,
): ReplaceCreditScheduleInput {
  return {
    creditId: context.creditId,
    expectedVersion: context.version,
    installments: [
      {
        id: context.id,
        sequence_no: context.payoff.sequenceNo,
        due_on: values.payOn,
        amount_minor: context.payoff.amountMinor,
      },
    ],
  }
}
