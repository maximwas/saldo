import { z } from 'zod'
import { CURRENCIES } from '@/constants/currencies.constants'
import type { CreateOperationInput } from '@/lib/finance/create-operation-input.schema'
import { toMinor } from '@/lib/money/money.utils'
import { type Clock, toOccurredAt } from '@/lib/utils/clock.utils'
import { adjustmentOf } from '../utils/accounts.utils'

/** a balance adjustment: the actual balance and why it differs; messages are keys of the errors namespace */
export const adjustmentFormSchema = z
  .object({
    actual: z.string(),
    currency: z.enum(CURRENCIES),
    /** the balance in Saldo now: the actual one must differ from it */
    currentMinor: z.int(),
    occurredOn: z.iso.date(),
    note: z.string().max(500),
  })
  .refine((values) => toMinor(values.actual, values.currency) !== null, {
    path: ['actual'],
    message: 'amountRequired',
  })
  .refine((values) => toMinor(values.actual, values.currency) !== values.currentMinor, {
    path: ['actual'],
    message: 'adjustmentNoChange',
  })
  .refine((values) => values.note.trim().length > 0, {
    path: ['note'],
    message: 'adjustmentNote',
  })

export type AdjustmentFormValues = z.infer<typeof adjustmentFormSchema>

type AdjustmentTarget = {
  id: string
  ledgerId: string
  accountId: string
}

/** an adjustment by the difference (§5): in when the actual balance is higher, out when lower */
export function toAdjustmentInput(
  values: AdjustmentFormValues,
  clock: Clock,
  target: AdjustmentTarget,
): CreateOperationInput {
  const change = adjustmentOf(values.currentMinor, toMinor(values.actual, values.currency) ?? values.currentMinor)

  if (!change) {
    throw new Error('An equal balance was not refused by the form schema')
  }

  return {
    id: target.id,
    ledger_id: target.ledgerId,
    kind: 'adjustment',
    direction: change.direction,
    account_id: target.accountId,
    amount_minor: change.amountMinor,
    currency: values.currency,
    occurred_at: toOccurredAt(values.occurredOn, clock),
    occurred_on: values.occurredOn,
    category_id: null,
    counterparty: null,
    note: values.note.trim(),
    refund_of_id: null,
    duplicated_from_id: null,
  }
}
