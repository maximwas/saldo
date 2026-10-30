import { z } from 'zod'
import { CURRENCIES } from '@/constants/currencies.constants'
import { toMinor } from '@/lib/money/money.utils'
import { type Clock, toOccurredAt } from '@/lib/utils/clock.utils'
import type { PayObligationInput } from './pay-obligation-input.schema'

/** the "paid" sheet: confirm amount, date and account, or link an operation that already exists (§7) */
export const payObligationFormSchema = z
  .object({
    amount: z.string(),
    /** the account currency, which the new operation takes */
    currency: z.enum(CURRENCIES),
    accountId: z.uuid().nullable(),
    existingOperationId: z.uuid().nullable(),
    occurredOn: z.iso.date(),
    settle: z.boolean(),
    note: z.string().max(500),
  })
  .refine((values) => (toMinor(values.amount, values.currency) ?? 0) > 0, {
    path: ['amount'],
    message: 'amountInvalid',
  })
  .refine((values) => values.existingOperationId !== null || values.accountId !== null, {
    path: ['accountId'],
    message: 'accountRequired',
  })

export type PayObligationFormValues = z.infer<typeof payObligationFormSchema>

type PayObligationContext = {
  paymentId: string
  /** id for the new operation, made before mutate like paymentId */
  operationId: string
  ledgerId: string
  obligation: {
    id: string
    version: number
    /** out = a payment to make, in = expected income (a debt owed to me) */
    direction: 'out' | 'in'
    categoryId: string | null
  }
}

export function toPayObligationInput(
  values: PayObligationFormValues,
  clock: Clock,
  context: PayObligationContext,
): PayObligationInput {
  const amountMinor = toMinor(values.amount, values.currency)

  if (amountMinor === null) {
    throw new Error('Amount was not validated by the form schema')
  }

  const newOperation =
    values.existingOperationId === null && values.accountId !== null
      ? {
          id: context.operationId,
          ledger_id: context.ledgerId,
          kind: context.obligation.direction === 'in' ? ('income' as const) : ('expense' as const),
          direction: context.obligation.direction,
          account_id: values.accountId,
          amount_minor: amountMinor,
          currency: values.currency,
          occurred_at: toOccurredAt(values.occurredOn, clock),
          occurred_on: values.occurredOn,
          category_id: context.obligation.categoryId,
          counterparty: null,
          note: values.note.trim() || null,
        }
      : null

  return {
    paymentId: context.paymentId,
    obligationId: context.obligation.id,
    expectedVersion: context.obligation.version,
    amountMinor,
    newOperation,
    existingOperationId: values.existingOperationId,
    settle: values.settle,
  }
}
