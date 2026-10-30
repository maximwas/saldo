import { z } from 'zod'
import { CURRENCIES } from '@/constants/currencies.constants'
import type { SaveRateInput } from './rate-input.schema'

/** «41,5», «41.50»: a positive decimal with at most the 10 digits of numeric(20,10) after the point */
const RATE_TEXT = /^\d{1,10}([.,]\d{1,10})?$/

export const parseRate = (text: string): number | null => {
  const trimmed = text.trim()

  if (!RATE_TEXT.test(trimmed)) {
    return null
  }

  const rate = Number(trimmed.replace(',', '.'))

  return rate > 0 ? rate : null
}

/** messages are keys of the errors namespace; FormField translates them */
export const rateFormSchema = z.object({
  /** the foreign currency: 1 unit of it costs `rate` units of the base currency */
  currency: z.enum(CURRENCIES),
  rate: z.string().refine((text) => parseRate(text) !== null, 'rateInvalid'),
  rateOn: z.iso.date('dateInvalid'),
})

export type RateFormValues = z.infer<typeof rateFormSchema>

type RateContext = {
  ledgerId: string
  baseCurrency: string
}

/** fx_rates.rate = units of quote_currency per 1 base_currency (EUR → UAH 41.5), so the foreign currency is the base */
export const toSaveRateInput = (values: RateFormValues, context: RateContext): SaveRateInput => ({
  ledger_id: context.ledgerId,
  base_currency: values.currency,
  quote_currency: context.baseCurrency as SaveRateInput['quote_currency'],
  // the schema has already refused text that is not a rate
  rate: parseRate(values.rate) ?? 0,
  rate_on: values.rateOn,
  source: 'manual',
  source_name: null,
})
