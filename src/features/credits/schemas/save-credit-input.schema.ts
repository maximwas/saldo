import { z } from 'zod'
import { CURRENCIES } from '@/constants/currencies.constants'

/** one row of p_installments: CreditSchedule.installments of installments.utils, or a row typed in from the bank */
export const installmentInputSchema = z.object({
  sequence_no: z.int().positive(),
  due_on: z.iso.date(),
  /** null = amount unknown, never 0 */
  amount_minor: z.int().positive().nullable(),
})

/** a new credit: p_credit without `version` (a replay returns the row, nothing written) */
const createCreditSchema = z.object({
  id: z.uuid(),
  ledger_id: z.uuid(),
  name: z.string().trim().min(1).max(200),
  lender: z.string().trim().max(200).nullable(),
  purchase_price_minor: z.int().positive().nullable(),
  total_payable_minor: z.int().positive().nullable(),
  currency: z.enum(CURRENCIES),
  installments_count: z.int().positive(),
  regular_installment_minor: z.int().positive().nullable(),
  last_installment_minor: z.int().positive().nullable(),
  account_id: z.uuid().nullable(),
  schedule_accuracy: z.enum(['bank_confirmed', 'estimated']),
  paid_before_tracking_count: z.int().nonnegative(),
  paid_before_tracking_minor: z.int().nonnegative().nullable(),
})

/** an edit is a partial patch that carries the version it was made from (stale → PT409) */
const editCreditSchema = z
  .object({
    name: z.string().trim().min(1).max(200),
    lender: z.string().trim().max(200).nullable(),
    purchase_price_minor: z.int().positive().nullable(),
    account_id: z.uuid().nullable(),
    status: z.enum(['active', 'closed', 'cancelled']),
  })
  .partial()
  .extend({
    id: z.uuid(),
    ledger_id: z.uuid(),
    version: z.int().nonnegative(),
  })

export const saveCreditInputSchema = z.object({
  credit: z.union([editCreditSchema, createCreditSchema]),
  /** null = keep the schedule (an edit); a create always sends its schedule */
  installments: z.array(installmentInputSchema).nullable(),
})

export type SaveCreditInput = z.input<typeof saveCreditInputSchema>
