import { z } from 'zod'
import { CURRENCIES } from '@/constants/currencies.constants'
import {
  adjustmentHasNote,
  type CreateOperationInput,
  OPERATION_KINDS,
} from '@/lib/finance/create-operation-input.schema'
import { toMinor } from '@/lib/money/money.utils'
import { type Clock, toOccurredAt } from '@/lib/utils/clock.utils'
import type { UpdateOperationInput } from './update-operation-input.schema'

const TIME = z.iso.time({ precision: -1 })

/** messages are keys of the errors namespace; the form translates them */
export const operationFormSchema = z
  .object({
    kind: z.enum(OPERATION_KINDS),
    /** read only for an adjustment; the other kinds have a fixed direction */
    direction: z.enum(['in', 'out']),
    amount: z.string(),
    currency: z.enum(CURRENCIES),
    accountId: z.uuid(),
    categoryId: z.uuid().nullable(),
    occurredOn: z.iso.date(),
    /** HH:mm, or empty: now for today, noon for another day */
    occurredTime: z.string().refine((time) => time === '' || TIME.safeParse(time).success, { message: 'timeInvalid' }),
    counterparty: z.string().max(200),
    note: z.string().max(500),
  })
  .refine((values) => (toMinor(values.amount, values.currency) ?? 0) > 0, {
    path: ['amount'],
    message: 'amountInvalid',
  })
  .refine(adjustmentHasNote, {
    path: ['note'],
    message: 'adjustmentNote',
  })
  // Figma new-operation error frames 5:93500 / 5:101464: an expense needs both
  .refine((values) => values.kind !== 'expense' || values.categoryId !== null, {
    path: ['categoryId'],
    message: 'categoryRequired',
  })
  .refine((values) => values.kind !== 'expense' || values.counterparty.trim() !== '', {
    path: ['counterparty'],
    message: 'counterpartyRequired',
  })

export type OperationFormValues = z.infer<typeof operationFormSchema>

// shared by create and update; duplicated_from_id is set once at create, so an edit never clears it
type OperationFields = Omit<CreateOperationInput, 'id' | 'ledger_id' | 'duplicated_from_id'>

type CreateOperationIds = {
  id: string
  ledgerId: string
  /** «duplicate» (plan 1.8): the operation this one copies */
  duplicatedFromId?: string
  /** a refund: the purchase it returns (§5) */
  refundOfId?: string
}

type UpdateOperationTarget = {
  id: string
  expectedVersion: number
}

/** amount that the form schema has already accepted */
export function validatedMinor(amount: string, currency: string): number {
  const minor = toMinor(amount, currency)

  if (minor === null) {
    throw new Error('Amount was not validated by the form schema')
  }

  return minor
}

const blankToNull = (text: string) => text.trim() || null

function toOperationFields(values: OperationFormValues, clock: Clock): OperationFields {
  const fixedDirection = values.kind === 'expense' ? 'out' : 'in'

  return {
    kind: values.kind,
    direction: values.kind === 'adjustment' ? values.direction : fixedDirection,
    account_id: values.accountId,
    amount_minor: validatedMinor(values.amount, values.currency),
    currency: values.currency,
    occurred_at: toOccurredAt(values.occurredOn, clock, values.occurredTime),
    occurred_on: values.occurredOn,
    category_id: values.categoryId,
    counterparty: blankToNull(values.counterparty),
    note: blankToNull(values.note),
    refund_of_id: null,
  }
}

/** ids are made before mutate, so a replay after reload carries the same idempotency key */
export const toCreateOperationInput = (
  values: OperationFormValues,
  clock: Clock,
  ids: CreateOperationIds,
): CreateOperationInput => ({
  id: ids.id,
  ledger_id: ids.ledgerId,
  ...toOperationFields(values, clock),
  refund_of_id: ids.refundOfId ?? null,
  duplicated_from_id: ids.duplicatedFromId ?? null,
})

export const toUpdateOperationInput = (
  values: OperationFormValues,
  clock: Clock,
  target: UpdateOperationTarget,
): UpdateOperationInput => ({
  id: target.id,
  expectedVersion: target.expectedVersion,
  patch: toOperationFields(values, clock),
})
