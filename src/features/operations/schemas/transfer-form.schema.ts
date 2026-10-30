import { z } from 'zod'
import { CURRENCIES } from '@/constants/currencies.constants'
import { toMinor } from '@/lib/money/money.utils'
import { type Clock, toOccurredAt } from '@/lib/utils/clock.utils'
import type { CreateTransferInput } from './create-transfer-input.schema'
import { validatedMinor } from './operation-form.schema'

const isPositive = (amount: string, currency: string) => (toMinor(amount, currency) ?? 0) > 0

/** messages are keys of the errors namespace; the form translates them */
export const transferFormSchema = z
  .object({
    fromAccountId: z.uuid(),
    toAccountId: z.uuid(),
    fromAmount: z.string(),
    fromCurrency: z.enum(CURRENCIES),
    /** empty = the same amount; required when the currencies differ */
    toAmount: z.string(),
    toCurrency: z.enum(CURRENCIES),
    /** empty = no fee */
    fee: z.string(),
    occurredOn: z.iso.date(),
    note: z.string().max(500),
  })
  .refine((values) => values.fromAccountId !== values.toAccountId, {
    path: ['toAccountId'],
    message: 'sameAccount',
  })
  .refine((values) => isPositive(values.fromAmount, values.fromCurrency), {
    path: ['fromAmount'],
    message: 'amountInvalid',
  })
  .refine(
    (values) =>
      values.toAmount.trim() === ''
        ? values.fromCurrency === values.toCurrency
        : isPositive(values.toAmount, values.toCurrency),
    {
      path: ['toAmount'],
      message: 'amountInvalid',
    },
  )
  .refine((values) => values.fee.trim() === '' || isPositive(values.fee, values.fromCurrency), {
    path: ['fee'],
    message: 'amountInvalid',
  })

export type TransferFormValues = z.infer<typeof transferFormSchema>

type CreateTransferIds = {
  id: string
  ledgerId: string
}

export function toCreateTransferInput(
  values: TransferFormValues,
  clock: Clock,
  ids: CreateTransferIds,
): CreateTransferInput {
  const fromAmountMinor = validatedMinor(values.fromAmount, values.fromCurrency)

  return {
    id: ids.id,
    ledger_id: ids.ledgerId,
    from_account_id: values.fromAccountId,
    to_account_id: values.toAccountId,
    from_amount_minor: fromAmountMinor,
    from_currency: values.fromCurrency,
    to_amount_minor:
      values.toAmount.trim() === '' ? fromAmountMinor : validatedMinor(values.toAmount, values.toCurrency),
    to_currency: values.toCurrency,
    fee_minor: values.fee.trim() === '' ? null : validatedMinor(values.fee, values.fromCurrency),
    occurred_at: toOccurredAt(values.occurredOn, clock),
    occurred_on: values.occurredOn,
    note: values.note.trim() || null,
  }
}
