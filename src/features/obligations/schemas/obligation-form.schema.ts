import { z } from 'zod'
import { CURRENCIES } from '@/constants/currencies.constants'
import { toMinor } from '@/lib/money/money.utils'
import type { CreateObligationInput, UpdateObligationInput } from './obligation-input.schema'

/** create / edit a one-off planned payment: an empty amount means «unknown», never 0 */
export const obligationFormSchema = z
  .object({
    title: z.string().trim().min(1, 'nameRequired').max(200),
    direction: z.enum(['out', 'in']),
    amount: z.string(),
    currency: z.enum(CURRENCIES),
    dueOn: z.iso.date('dateInvalid'),
    accountId: z.uuid().nullable(),
    categoryId: z.uuid().nullable(),
  })
  .refine((values) => values.amount.trim() === '' || (toMinor(values.amount, values.currency) ?? 0) > 0, {
    path: ['amount'],
    message: 'amountOptionalInvalid',
  })

export type ObligationFormValues = z.infer<typeof obligationFormSchema>

type CreateContext = {
  id: string
  ledgerId: string
}

type UpdateContext = CreateContext & {
  version: number
}

function toFields(values: ObligationFormValues) {
  return {
    title: values.title.trim(),
    direction: values.direction,
    planned_amount_minor: values.amount.trim() === '' ? null : toMinor(values.amount, values.currency),
    currency: values.currency,
    due_on: values.dueOn,
    account_id: values.accountId,
    category_id: values.categoryId,
  }
}

export function toCreateObligationInput(values: ObligationFormValues, context: CreateContext): CreateObligationInput {
  return {
    ...toFields(values),
    id: context.id,
    ledger_id: context.ledgerId,
    source_type: 'manual',
    occurrence_on: values.dueOn,
  }
}

export function toUpdateObligationInput(values: ObligationFormValues, context: UpdateContext): UpdateObligationInput {
  return {
    ...toFields(values),
    id: context.id,
    ledger_id: context.ledgerId,
    expectedVersion: context.version,
  }
}
