import { z } from 'zod'
import { CURRENCIES } from '@/constants/currencies.constants'

/** a manual row of public.fx_rates; fx_rates_unique (space, pair, day, source) makes a repeat the same rate, not a copy */
export const saveRateInputSchema = z
  .object({
    ledger_id: z.uuid(),
    base_currency: z.enum(CURRENCIES),
    quote_currency: z.enum(CURRENCIES),
    rate: z.number().positive(),
    rate_on: z.iso.date(),
    source: z.literal('manual'),
    source_name: z.string().max(80).nullable(),
  })
  .refine((row) => row.base_currency !== row.quote_currency, {
    path: ['quote_currency'],
    message: 'sameCurrency',
  })

export type SaveRateInput = z.infer<typeof saveRateInputSchema>
