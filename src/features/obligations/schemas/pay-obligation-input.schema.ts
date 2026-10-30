import { z } from 'zod'
import { CURRENCIES } from '@/constants/currencies.constants'

/** the expense that pay_obligation inserts from p_operation (columns of public.operations) */
const paymentOperationSchema = z.object({
  id: z.uuid(),
  ledger_id: z.uuid(),
  kind: z.literal('expense'),
  direction: z.literal('out'),
  account_id: z.uuid(),
  amount_minor: z.int().positive(),
  currency: z.enum(CURRENCIES),
  occurred_at: z.iso.datetime({ offset: true }),
  occurred_on: z.iso.date(),
  category_id: z.uuid().nullable(),
  counterparty: z.string().max(200).nullable(),
  note: z.string().max(500).nullable(),
})

/** arguments of pay_obligation, p_* in camelCase; exactly one of newOperation and existingOperationId */
export const payObligationInputSchema = z
  .object({
    paymentId: z.uuid(),
    obligationId: z.uuid(),
    expectedVersion: z.int().nonnegative(),
    amountMinor: z.int().positive(),
    newOperation: paymentOperationSchema.nullable(),
    existingOperationId: z.uuid().nullable(),
    reserveId: z.uuid().nullable(),
    settle: z.boolean(),
  })
  .refine((input) => (input.newOperation === null) !== (input.existingOperationId === null), {
    path: ['existingOperationId'],
    message: 'oneOperationSource',
  })

export type PayObligationInput = z.infer<typeof payObligationInputSchema>
