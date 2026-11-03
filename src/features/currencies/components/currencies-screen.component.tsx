'use client'

import { useLocale, useTranslations } from 'next-intl'
import { Badge } from '@/components/ui/badge.component'
import { ErrorState } from '@/components/ui/error-state.component'
import { CURRENCIES } from '@/constants/currencies.constants'
import { useToday } from '@/contexts/clock.context'
import { useCanWrite } from '@/contexts/ledger.context'
import { formatRate } from '@/lib/money/fx.utils'
import { currencySymbol } from '@/lib/money/money.utils'
import { useScreenQueryState } from '@/lib/query/screen-query-state.hook'
import { useRates } from '../hooks/currencies.hook'
import { rateBoard } from '../utils/currencies.utils'
import { RateForm } from './rate-form.component'

// stored rates of either direction (UAH → EUR is 0,024096) keep six decimals here
const RATE_DIGITS = 6
const CARD_CLASS = 'flex flex-col gap-5 rounded-card bg-card p-5 shadow-card lg:p-6'

// Settings cards (Figma «Saldo» → · 11:72807: Card padding 24, gap 20, title card-title); the
// base currency is read-only here — changing it belongs to the space settings
export function CurrenciesScreen() {
  const translate = useTranslations('currencies')
  const locale = useLocale()
  const canWrite = useCanWrite()
  const today = useToday()
  const query = useRates()
  const { data } = query
  const { failedLoad, retry } = useScreenQueryState([query], translate('refreshFailed'))

  if (failedLoad) {
    return <ErrorState title={translate('loadFailed')} onRetryAction={retry} />
  }

  if (data === undefined) {
    return <div aria-busy className="h-72 rounded-card bg-subtle" />
  }

  const formatDate = (day: string) =>
    new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date(`${day}T12:00:00`))
  const baseSymbol = currencySymbol(data.baseCurrency, locale)
  // the daily NBU rows of every currency would bury the account pairs: the history keeps those, the card above has all
  const history = data.rates.filter(
    (row) =>
      (CURRENCIES as readonly string[]).includes(row.baseCurrency) &&
      (CURRENCIES as readonly string[]).includes(row.quoteCurrency),
  )

  return (
    <div className="flex flex-col gap-4 lg:gap-6">
      <section className={CARD_CLASS}>
        <h2 className="text-card-title text-text-primary">{translate('base.title')}</h2>
        <p className="font-display text-number text-text-primary">
          {data.baseCurrency} · {translate(`names.${data.baseCurrency as 'UAH'}`)}
        </p>
        <p className="text-label text-text-secondary">{translate('base.hint')}</p>
      </section>
      <section className={CARD_CLASS}>
        <h2 className="text-card-title text-text-primary">{translate('current.title', { date: formatDate(today) })}</h2>
        <ul className="flex flex-col">
          {rateBoard(data.rates, data.baseCurrency, today).map((row) => (
            <li
              key={row.currency}
              className="flex items-center justify-between gap-3 border-b border-border py-3 last:border-b-0"
            >
              <span className="text-body font-medium text-text-primary">
                1 {currencySymbol(row.currency, locale)} ({row.currency})
              </span>
              {row.rate === null ? (
                <Badge tone="unknown">{translate('current.unknown')}</Badge>
              ) : (
                <span className="font-display text-number-sm text-text-primary tabular-nums">
                  {formatRate(row.rate, locale, RATE_DIGITS)} {baseSymbol}
                </span>
              )}
            </li>
          ))}
        </ul>
      </section>
      {canWrite ? (
        <section className={CARD_CLASS}>
          <h2 className="text-card-title text-text-primary">{translate('form.title')}</h2>
          <RateForm />
        </section>
      ) : null}
      <section className={CARD_CLASS}>
        <h2 className="text-card-title text-text-primary">{translate('list.title')}</h2>
        {history.length === 0 ? (
          <p className="text-label text-text-secondary">{translate('list.empty')}</p>
        ) : (
          <ul className="flex flex-col">
            {history.map((row) => (
              <li
                key={`${row.baseCurrency}-${row.quoteCurrency}-${row.rateOn}-${row.source}`}
                className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-border py-3 last:border-b-0"
              >
                <span className="min-w-24 text-body font-medium text-text-primary">
                  {row.baseCurrency} → {row.quoteCurrency}
                </span>
                <span className="flex-1 font-display text-number-sm text-text-primary tabular-nums">
                  {formatRate(row.rate, locale, RATE_DIGITS)}
                </span>
                <span className="text-label text-text-secondary">{formatDate(row.rateOn)}</span>
                <Badge tone={row.source === 'manual' ? 'info' : 'neutral'}>{translate(`source.${row.source}`)}</Badge>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
