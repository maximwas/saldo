import { z } from 'zod'
import { CURRENCIES } from '@/constants/currencies.constants'

/** columns of public.obligations that a one-off planned payment (source_type 'manual') writes through PostgREST */
const obligationFieldsSchema = z.object({
  title: z.string().trim().min(1).max(200),
  direction: z.enum(['out', 'in']),
  /** null = amount unknown (§7), never 0 */
  planned_amount_minor: z.int().positive().nullable(),
  currency: z.enum(CURRENCIES),
  due_on: z.iso.date(),
  account_id: z.uuid().nullable(),
  category_id: z.uuid().nullable(),
})

export const createObligationInputSchema = obligationFieldsSchema.extend({
  id: z.uuid(),
  ledger_id: z.uuid(),
  source_type: z.literal('manual'),
  /** the nominal series date; for a one-off it is the due date */
  occurrence_on: z.iso.date(),
})

export const updateObligationInputSchema = obligationFieldsSchema.extend({
  id: z.uuid(),
  ledger_id: z.uuid(),
  expectedVersion: z.int().nonnegative(),
})

export type CreateObligationInput = z.infer<typeof createObligationInputSchema>
export type UpdateObligationInput = z.infer<typeof updateObligationInputSchema>
