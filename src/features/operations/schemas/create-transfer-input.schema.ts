import { z } from 'zod'
import { CURRENCIES } from '@/constants/currencies.constants'

/** p_transfer of create_transfer: real amounts on both sides, never fitted to a rate (§5); the fee is a separate expense */
export const createTransferInputSchema = z
  .object({
    id: z.uuid(),
    ledger_id: z.uuid(),
    from_account_id: z.uuid(),
    to_account_id: z.uuid(),
    from_amount_minor: z.int().positive(),
    from_currency: z.enum(CURRENCIES),
    to_amount_minor: z.int().positive(),
    to_currency: z.enum(CURRENCIES),
    /** in from_currency, taken from the source account */
    fee_minor: z.int().positive().nullable(),
    /** expense category of the fee operation; null without a fee or category */
    fee_category_id: z.uuid().nullable(),
    occurred_at: z.iso.datetime({ offset: true }),
    /** local date for the transfer_out / transfer_in operations */
    occurred_on: z.iso.date(),
    note: z.string().max(500).nullable(),
  })
  .refine((transfer) => transfer.from_account_id !== transfer.to_account_id, {
    path: ['to_account_id'],
    message: 'sameAccount',
  })

export type CreateTransferInput = z.infer<typeof createTransferInputSchema>
