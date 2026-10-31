import { z } from 'zod'
import { CURRENCIES } from '@/constants/currencies.constants'
import { toMinor } from '@/lib/money/money.utils'
import { type Clock, toOccurredAt } from '@/lib/utils/clock.utils'
import { type DebtDirection, movementOperationKind } from '../utils/debts.utils'
import type { DebtOperation } from './debt-operation.schema'
import type { SaveDebtInput } from './save-debt-input.schema'

export const DEBT_ORIGINS = ['new_movement', 'existing_no_movement', 'purchase_share'] as const

/** a new debt: money moving now, an old debt without a movement, or the other person's share of a purchase (§10) */
export const debtFormSchema = z
  .object({
    origin: z.enum(DEBT_ORIGINS),
    direction: z.enum(['owed_to_me', 'i_owe']),
    person: z.string().trim().min(1, 'nameRequired').max(80),
    reason: z.string().trim().max(200),
    amount: z.string(),
    currency: z.enum(CURRENCIES),
    accountId: z.uuid().nullable(),
    arisenOn: z.iso.date('dateInvalid'),
    dueOn: z.iso.date().nullable(),
    purchaseId: z.uuid().nullable(),
    note: z.string().trim().max(500),
  })
  .refine((values) => (toMinor(values.amount, values.currency) ?? 0) > 0, {
    path: ['amount'],
    message: 'amountInvalid',
  })
  .refine((values) => values.origin !== 'new_movement' || values.accountId !== null, {
    path: ['accountId'],
    message: 'accountRequired',
  })
  .refine((values) => values.origin !== 'purchase_share' || values.purchaseId !== null, {
    path: ['purchaseId'],
    message: 'purchaseRequired',
  })

export type DebtFormValues = z.infer<typeof debtFormSchema>

type CreateDebtContext = {
  debtId: string
  operationId: string
  ledgerId: string
}

const nullIfEmpty = (text: string) => text.trim() || null

function toMovementOperation(
  values: DebtFormValues,
  minor: number,
  direction: DebtDirection,
  context: CreateDebtContext,
  clock: Clock,
): DebtOperation | null {
  if (values.origin !== 'new_movement' || values.accountId === null) {
    return null
  }

  const kind = movementOperationKind(direction, 'principal')

  return {
    id: context.operationId,
    ledger_id: context.ledgerId,
    kind,
    direction: kind === 'debt_in' ? 'in' : 'out',
    account_id: values.accountId,
    amount_minor: minor,
    currency: values.currency,
    occurred_at: toOccurredAt(values.arisenOn, clock),
    occurred_on: values.arisenOn,
    category_id: null,
    counterparty: values.person,
    note: nullIfEmpty(values.note),
  }
}

export function toCreateDebtInput(values: DebtFormValues, clock: Clock, context: CreateDebtContext): SaveDebtInput {
  const minor = toMinor(values.amount, values.currency)

  if (minor === null) {
    throw new Error('Amount was not validated by the form schema')
  }

  // a purchase share is always owed to me: I paid the purchase
  const direction = values.origin === 'purchase_share' ? 'owed_to_me' : values.direction

  return {
    debt: {
      id: context.debtId,
      ledger_id: context.ledgerId,
      direction,
      person: values.person,
      reason: nullIfEmpty(values.reason),
      principal_minor: minor,
      currency: values.currency,
      arisen_on: values.arisenOn,
      account_id: values.accountId,
      due_on: values.dueOn,
      origin: values.origin,
      share_of_operation_id: values.origin === 'purchase_share' ? values.purchaseId : null,
      note: nullIfEmpty(values.note),
    },
    operation: toMovementOperation(values, minor, direction, context, clock),
  }
}
