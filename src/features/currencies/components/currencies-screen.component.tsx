'use client'

import { useLocale, useTranslations } from 'next-intl'
import { Badge } from '@/components/ui/badge.component'
import { useClock } from '@/contexts/clock.context'
import { useCanWrite, useLedger } from '@/contexts/ledger.context'
import { currencySymbol } from '@/lib/money/money.utils'
import { localDate } from '@/lib/utils/clock.utils'
import { useRates } from '../hooks/currencies.hook'
import { currentRates } from '../utils/currencies.utils'
import { RateForm } from './rate-form.component'

const CARD_CLASS = 'flex flex-col gap-5 rounded-card bg-card p-5 shadow-card lg:p-6'

// Settings cards (Figma «Saldo» → · 11:72807: Card padding 24, gap 20, title card-title); the
// base currency is read-only here — changing it belongs to the space settings
export function CurrenciesScreen() {
  const translate = useTranslations('currencies')
  const locale = useLocale()
  const clock = useClock()
  const canWrite = useCanWrite()
  const { timeZone } = useLedger()
  const { data, isPending, isError } = useRates()

  if (isPending) {
    return <div aria-busy className="h-72 rounded-card bg-subtle" />
  }

  if (isError) {
    return (
      <p role="alert" className="text-body text-negative-text">
        {translate('loadFailed')}
      </p>
    )
  }

  const today = localDate(clock.now(), timeZone)
  const formatRate = (rate: string) =>
    new Intl.NumberFormat(locale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 6,
    }).format(Number(rate))
  const formatDate = (day: string) =>
    new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date(`${day}T12:00:00`))
  const baseSymbol = currencySymbol(data.baseCurrency, locale)

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
          {currentRates(data.rates, data.baseCurrency, today).map((row) => (
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
                  {formatRate(row.rate)} {baseSymbol}
                </span>
              )}
            </li>
          ))}
        </ul>
      </section>
      {canWrite ? (
        <section className={CARD_CLASS}>
          <h2 className="text-card-title text-text-primary">{translate('form.title')}</h2>
          <RateForm baseCurrency={data.baseCurrency} />
        </section>
      ) : null}
      <section className={CARD_CLASS}>
        <h2 className="text-card-title text-text-primary">{translate('list.title')}</h2>
        {data.rates.length === 0 ? (
          <p className="text-label text-text-secondary">{translate('list.empty')}</p>
        ) : (
          <ul className="flex flex-col">
            {data.rates.map((row) => (
              <li
                key={`${row.baseCurrency}-${row.quoteCurrency}-${row.rateOn}-${row.source}`}
                className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-border py-3 last:border-b-0"
              >
                <span className="min-w-24 text-body font-medium text-text-primary">
                  {row.baseCurrency} → {row.quoteCurrency}
                </span>
                <span className="flex-1 font-display text-number-sm text-text-primary tabular-nums">
                  {formatRate(String(row.rate))}
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
