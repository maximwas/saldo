import { z } from 'zod'
import { CURRENCIES } from '@/constants/currencies.constants'

export const createLedgerSchema = z.object({
  id: z.uuid(),
  name: z.string().trim().min(1).max(60),
  baseCurrency: z.enum(CURRENCIES),
})

export type CreateLedgerInput = z.infer<typeof createLedgerSchema>
