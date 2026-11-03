import { z } from 'zod'
import { CURRENCIES } from '@/constants/currencies.constants'
import { fromMinor, toMinor } from '@/lib/money/money.utils'
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

type PayDefaultsObligation = {
  accountId: string | null
  currency: string
  remainingMinor: number | null
  plannedMinor: number | null
}

type PayDefaultsAccount = {
  id: string
  currency: string
}

/** the plan's own account, else one in its currency, else the first */
const payAccount = (obligation: PayDefaultsObligation, accounts: PayDefaultsAccount[]) =>
  accounts.find((item) => item.id === obligation.accountId) ??
  accounts.find((item) => item.currency === obligation.currency) ??
  accounts[0]

/** what remains of the plan; empty when the account is in another currency or the sum is unknown */
function suggestedAmount(obligation: PayDefaultsObligation, account: PayDefaultsAccount | undefined) {
  const minor = obligation.remainingMinor ?? obligation.plannedMinor

  if (account?.currency !== obligation.currency || minor === null) {
    return ''
  }

  return fromMinor(minor, obligation.currency)
}

/** what the «Paid» sheet starts with (Figma 55:127451): what remains of the plan, paid today, from the plan's account.
 * A late payment is dated today as well: the person pays now, and the calendar writes the fact on that date. */
export function payFormDefaults(
  obligation: PayDefaultsObligation,
  accounts: PayDefaultsAccount[],
  today: string,
): z.input<typeof payObligationFormSchema> {
  const account = payAccount(obligation, accounts)

  return {
    amount: suggestedAmount(obligation, account),
    currency: (account?.currency ?? obligation.currency) as PayObligationFormValues['currency'],
    accountId: account?.id ?? null,
    existingOperationId: null,
    occurredOn: today,
    settle: false,
    note: '',
  }
}

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
