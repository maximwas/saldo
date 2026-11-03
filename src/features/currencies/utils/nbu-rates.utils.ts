import { z } from 'zod'
import { CURRENCIES } from '@/constants/currencies.constants'
import { type FxRate, findRate } from '@/lib/money/fx.utils'

/** fx_rates.source_name of the reference rates the daily cron takes from the National Bank of Ukraine */
const NBU_SOURCE_NAME = 'nbu'

/** a row of public.fx_rates the cron writes */
export type ReferenceRateRow = {
  ledger_id: string
  base_currency: string
  quote_currency: string
  rate: number
  rate_on: string
  source: 'reference'
  source_name: string
}

type LedgerBase = {
  id: string
  base_currency: string
}

// a row of https://bank.gov.ua/NBUStatService/v1/statdirectory/exchange?json: 1 unit of `cc` costs `rate` UAH
const nbuRowSchema = z.object({
  cc: z.enum(CURRENCIES),
  rate: z.number().positive(),
  exchangedate: z.string().regex(/^\d{2}\.\d{2}\.\d{4}$/),
})

const nbuAnswerSchema = z.array(
  z
    .object({
      cc: z.string(),
    })
    .loose(),
)

/** NBU answer → «1 unit of the currency costs `rate` UAH» for the currencies a space may hold; a broken row of one of
 * them throws, so a bad answer is never written; other currencies are not read */
export function parseNbuRates(json: unknown): FxRate[] {
  return nbuAnswerSchema
    .parse(json)
    .filter((row) => (CURRENCIES as readonly string[]).includes(row.cc))
    .map((row) => {
      const { cc, rate, exchangedate } = nbuRowSchema.parse(row)
      const [day, month, year] = exchangedate.split('.')

      return {
        baseCurrency: cc,
        quoteCurrency: 'UAH',
        // a JSON number of at most 4 decimals: String keeps every digit
        rate: String(rate),
        rateOn: `${year}-${month}-${day}`,
        source: 'reference',
      }
    })
}

/** for every space: each other allowed currency → the space's base currency, on the NBU date. The direction of a manual
 * rate (toSaveRateInput), so rule A compares both as one pair; a non-UAH base is crossed through UAH by findRate and
 * rounded to the 10 decimals of numeric(20,10) */
export function toReferenceRows(nbuRates: FxRate[], ledgers: readonly LedgerBase[]): ReferenceRateRow[] {
  const rateOn = nbuRates
    .map((row) => row.rateOn)
    .sort()
    .at(-1)

  if (rateOn === undefined) {
    return []
  }

  return ledgers.flatMap((ledger) =>
    CURRENCIES.filter((currency) => currency !== ledger.base_currency).flatMap((currency) => {
      const rate = findRate(nbuRates, currency, ledger.base_currency, rateOn)

      return rate === null
        ? []
        : [
            {
              ledger_id: ledger.id,
              base_currency: currency,
              quote_currency: ledger.base_currency,
              rate: rate.toDecimalPlaces(10).toNumber(),
              rate_on: rateOn,
              source: 'reference' as const,
              source_name: NBU_SOURCE_NAME,
            },
          ]
    }),
  )
}
