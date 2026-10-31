import { z } from 'zod'
import type { CURRENCIES } from '@/constants/currencies.constants'
import { toMinor } from '@/lib/money/money.utils'
import { type Clock, toOccurredAt } from '@/lib/utils/clock.utils'
import { type DebtDirection, movementOperationKind } from '../utils/debts.utils'
import type { AddDebtMovementInput } from './add-debt-movement-input.schema'

/** a (partial) repayment; no account = recorded without money moving now */
export const repaymentFormSchema = z
  .object({
    amount: z.string(),
    currency: z.string(),
    accountId: z.uuid().nullable(),
    occurredOn: z.iso.date('dateInvalid'),
  })
  .refine((values) => (toMinor(values.amount, values.currency) ?? 0) > 0, {
    path: ['amount'],
    message: 'amountInvalid',
  })

export type RepaymentFormValues = z.infer<typeof repaymentFormSchema>

type RepaymentContext = {
  movementId: string
  operationId: string
  ledgerId: string
  debt: {
    id: string
    direction: DebtDirection
    person: string
    currency: (typeof CURRENCIES)[number]
  }
}

export function toRepaymentInput(
  values: RepaymentFormValues,
  clock: Clock,
  context: RepaymentContext,
): AddDebtMovementInput {
  const minor = toMinor(values.amount, context.debt.currency)

  if (minor === null) {
    throw new Error('Amount was not validated by the form schema')
  }

  const kind = movementOperationKind(context.debt.direction, 'repayment')

  return {
    movement: {
      id: context.movementId,
      debt_id: context.debt.id,
      amount_minor: minor,
      occurred_on: values.occurredOn,
    },
    operation:
      values.accountId === null
        ? null
        : {
            id: context.operationId,
            ledger_id: context.ledgerId,
            kind,
            direction: kind === 'debt_in' ? 'in' : 'out',
            account_id: values.accountId,
            amount_minor: minor,
            currency: context.debt.currency,
            occurred_at: toOccurredAt(values.occurredOn, clock),
            occurred_on: values.occurredOn,
            category_id: null,
            counterparty: context.debt.person,
            note: null,
          },
  }
}
