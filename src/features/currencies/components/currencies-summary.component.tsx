'use client'

import { useLocale, useTranslations } from 'next-intl'
import { useToday } from '@/contexts/clock.context'
import { useLedgerStore } from '@/contexts/ledger.context'
import { currencySymbol } from '@/lib/money/money.utils'
import { useRates } from '../hooks/currencies.hook'
import { currentRates } from '../utils/currencies.utils'

// Figma «Saldo» → Settings / Mobile 2:35769, the Currencies row (base currency, then today's rates), today's rate of
// every currency that has one (no rate, no entry)
export function CurrenciesSummary() {
  const translate = useTranslations('currencies')
  const locale = useLocale()
  const today = useToday()
  const baseCurrency = useLedgerStore((ledger) => ledger.baseCurrency)
  const { data } = useRates()
  const format = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  const rates = data ? currentRates(data.rates, data.baseCurrency, today) : []

  return [
    translate('summaryBase', { symbol: currencySymbol(baseCurrency, locale) }),
    ...rates.flatMap(({ currency, rate }) =>
      rate === null ? [] : [`${currencySymbol(currency, locale)} ${format.format(Number(rate))}`],
    ),
  ].join(' · ')
}
