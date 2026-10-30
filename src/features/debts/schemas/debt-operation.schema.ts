import { z } from 'zod'
import { CURRENCIES } from '@/constants/currencies.constants'

/** the operation a debt movement carries (columns of public.operations): the server sets the kind, amount, currency
 * and no category, so the row is a debt_out / debt_in and never income or expense (§10) */
export const debtOperationSchema = z.object({
  id: z.uuid(),
  ledger_id: z.uuid(),
  kind: z.enum(['debt_out', 'debt_in']),
  direction: z.enum(['out', 'in']),
  account_id: z.uuid(),
  amount_minor: z.int().positive(),
  currency: z.enum(CURRENCIES),
  occurred_at: z.iso.datetime({ offset: true }),
  occurred_on: z.iso.date(),
  category_id: z.null(),
  counterparty: z.string().max(200).nullable(),
  note: z.string().max(500).nullable(),
})

export type DebtOperation = z.infer<typeof debtOperationSchema>
