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
  cc: z.string().regex(/^[A-Z]{3}$/),
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

/** NBU answer → «1 unit of the currency costs `rate` UAH» for every currency NBU publishes (Maxim, 3.11). A broken row of
 * a currency a space may hold throws, so a bad answer is never written; a broken row of another currency is skipped */
export function parseNbuRates(json: unknown): FxRate[] {
  return nbuAnswerSchema.parse(json).flatMap((row): FxRate[] => {
    const parsed = nbuRowSchema.safeParse(row)

    if (!parsed.success) {
      if ((CURRENCIES as readonly string[]).includes(row.cc)) {
        throw parsed.error
      }

      return []
    }

    const { cc, rate, exchangedate } = parsed.data
    const [day, month, year] = exchangedate.split('.')

    return [
      {
        baseCurrency: cc,
        quoteCurrency: 'UAH',
        // a JSON number of at most 4 decimals: String keeps every digit
        rate: String(rate),
        rateOn: `${year}-${month}-${day}`,
        source: 'reference',
      },
    ]
  })
}

/** for every space: UAH and every NBU currency except the base → the space's base currency, on the NBU date. The
 * direction of a manual rate (toSaveRateInput), so rule A compares both as one pair; a non-UAH base is crossed through
 * UAH by findRate and rounded to the 10 decimals of numeric(20,10) */
export function toReferenceRows(nbuRates: FxRate[], ledgers: readonly LedgerBase[]): ReferenceRateRow[] {
  const rateOn = nbuRates
    .map((row) => row.rateOn)
    .sort()
    .at(-1)

  if (rateOn === undefined) {
    return []
  }

  const currencies = ['UAH', ...nbuRates.map((row) => row.baseCurrency)]

  return ledgers.flatMap((ledger) =>
    currencies
      .filter((currency) => currency !== ledger.base_currency)
      .flatMap((currency) => {
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
