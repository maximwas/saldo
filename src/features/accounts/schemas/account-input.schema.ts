import { z } from 'zod'
import { CATEGORY_COLORS } from '@/constants/category-colors.constants'
import { CURRENCIES } from '@/constants/currencies.constants'
import { ACCOUNT_KINDS } from '../utils/accounts.utils'

/** a row of public.accounts as the client inserts it; minor units, the id comes from the client */
export const createAccountInputSchema = z.object({
  id: z.uuid(),
  ledger_id: z.uuid(),
  name: z.string().trim().min(1).max(80),
  kind: z.enum(ACCOUNT_KINDS),
  currency: z.enum(CURRENCIES),
  opening_balance_minor: z.int(),
  opening_balance_on: z.iso.date(),
  color: z.enum(CATEGORY_COLORS).nullable(),
  icon: z.string().max(40).nullable(),
  include_in_total: z.boolean(),
  include_in_available: z.boolean(),
  sort_order: z.int(),
})

export type CreateAccountInput = z.infer<typeof createAccountInputSchema>

/** an update carries the version it was made from: a stale one is a conflict (PT409), not a silent overwrite */
export const updateAccountInputSchema = z.object({
  id: z.uuid(),
  expectedVersion: z.int().positive(),
  patch: z
    .object({
      name: z.string().trim().min(1).max(80),
      kind: z.enum(ACCOUNT_KINDS),
      include_in_total: z.boolean(),
      include_in_available: z.boolean(),
      archived_at: z.iso.datetime({ offset: true }).nullable(),
    })
    .partial(),
})

export type UpdateAccountInput = z.infer<typeof updateAccountInputSchema>
