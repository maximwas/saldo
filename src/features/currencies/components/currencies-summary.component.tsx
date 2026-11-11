'use client'

import { useLocale, useTranslations } from 'next-intl'
import { CURRENCIES } from '@/constants/currencies.constants'
import { useToday } from '@/contexts/clock.context'
import { useLedgerStore } from '@/contexts/ledger.context'
import { formatRate } from '@/lib/money/fx.utils'
import { currencySymbol } from '@/lib/money/money.utils'
import { useHydrated } from '@/lib/utils/hydrated.hook'
import { useRates } from '../hooks/currencies.hook'
import { rateBoard } from '../utils/currencies.utils'

// Figma «Saldo» → Settings / Mobile 2:35769, the Currencies row (base currency, then today's rates), today's rate of
// every account currency that has one (no rate, no entry)
export function CurrenciesSummary() {
  const translate = useTranslations('currencies')
  const locale = useLocale()
  const today = useToday()
  const baseCurrency = useLedgerStore((ledger) => ledger.baseCurrency)
  const { data } = useRates()
  const hydrated = useHydrated()
  const rates =
    hydrated && data
      ? rateBoard(data.rates, data.baseCurrency, today).filter((row) =>
          (CURRENCIES as readonly string[]).includes(row.currency),
        )
      : []

  return [
    translate('summaryBase', { symbol: currencySymbol(baseCurrency, locale) }),
    ...rates.flatMap(({ currency, rate }) =>
      rate === null ? [] : [`${currencySymbol(currency, locale)} ${formatRate(rate, locale)}`],
    ),
  ].join(' · ')
}
