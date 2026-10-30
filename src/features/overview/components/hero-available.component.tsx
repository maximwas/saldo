'use client'

import { Info } from 'lucide-react'
import { useFormatter, useLocale, useTranslations } from 'next-intl'
import { useState } from 'react'
import { Amount } from '@/components/ui/amount.component'
import { useLedger } from '@/contexts/ledger.context'
import { formatMinor } from '@/lib/money/money.utils'
import type { Overview } from '../api/overview.api'
import { isoToDate } from '../utils/overview.utils'
import { IncomeDateSheet } from './income-date-sheet.component'

type HeroAvailableProps = {
  overview: Overview
}

type RowProps = {
  label: string
  minor: number | null
  currency: string
  total?: boolean
}

function Row({ label, minor, currency, total = false }: RowProps) {
  return (
    <div
      className={
        total
          ? 'flex items-baseline justify-between gap-3 border-t border-on-primary/30 pt-3'
          : 'flex items-baseline justify-between gap-3'
      }
    >
      <dt className={total ? 'text-label font-semibold' : 'text-caption text-on-primary/85'}>{label}</dt>
      <dd>
        <Amount
          minor={minor}
          currency={currency}
          className={total ? 'font-semibold text-on-primary' : 'text-on-primary'}
        />
      </dd>
    </div>
  )
}

// Figma «Saldo» → Overview 2:8237 / 2:8735 hero: primary, radius/card; left the figure, right "How it is calculated"
// (balances − obligations until the date = Available). Reserves arrive in phase 4, so the row is not drawn yet.
export function HeroAvailable({ overview }: HeroAvailableProps) {
  const translate = useTranslations('overview')
  const format = useFormatter()
  const locale = useLocale()
  const { available, baseCurrency, untilOn } = overview
  const [editing, setEditing] = useState(false)
  // ledgers.next_income_on is a space setting: RLS lets only the owner change it
  const isOwner = useLedger().role === 'owner'
  const hasDate = untilOn !== null
  const untilLabel = hasDate
    ? format.dateTime(isoToDate(untilOn), {
        timeZone: 'UTC',
        day: 'numeric',
        month: 'long',
      })
    : ''

  return (
    <section className="flex flex-col gap-6 rounded-card bg-primary p-6 text-on-primary lg:flex-row lg:items-center lg:justify-between lg:gap-8 lg:p-8">
      <div className="flex min-w-0 flex-col gap-3">
        <h2 className="flex items-center gap-3 text-body">
          {hasDate ? translate('availableUntil', { date: untilLabel }) : translate('availableNoDate')}
          {isOwner && (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="rounded-xs text-label font-medium underline outline-none focus-visible:ring-2 focus-visible:ring-on-primary"
            >
              {translate(hasDate ? 'incomeDate.change' : 'incomeDate.set')}
            </button>
          )}
        </h2>
        {editing && (
          <IncomeDateSheet untilOn={untilOn} ledgerVersion={overview.ledgerVersion} onClose={() => setEditing(false)} />
        )}
        <Amount
          minor={hasDate ? available.availableMinor : null}
          currency={baseCurrency}
          size="xl"
          className="text-on-primary"
        />
        {!hasDate && (
          <p className="flex items-start gap-2 text-caption text-on-primary/85">{translate('noIncomeDate')}</p>
        )}
        {hasDate && available.expectedIncomeMinor !== null && available.expectedIncomeMinor > 0 && (
          <p className="flex items-start gap-2 text-caption text-on-primary/85">
            <Info aria-hidden size={16} className="mt-px shrink-0" />
            <span>
              {translate('expectedIncome', {
                amount: formatMinor(available.expectedIncomeMinor, baseCurrency, locale),
              })}
            </span>
          </p>
        )}
        {hasDate && available.unknownAmountIds.length > 0 && (
          <p className="text-caption text-on-primary/85">
            {translate('unknownAmounts', { count: available.unknownAmountIds.length })}
          </p>
        )}
        {hasDate && available.unknownRateCurrencies.length > 0 && (
          <p className="text-caption text-on-primary/85">
            {translate('unknownRates', { currencies: available.unknownRateCurrencies.join(', ') })}
          </p>
        )}
      </div>

      <div className="flex w-full flex-col gap-3 rounded-inner bg-primary-hover p-5 lg:w-100 lg:shrink-0">
        <p className="text-micro text-on-primary/85">{translate('howWeCount')}</p>
        <dl className="flex flex-col gap-3">
          <Row label={translate('balances')} minor={available.balancesMinor} currency={baseCurrency} />
          {hasDate && (
            <>
              <Row
                label={translate('obligationsUntil', {
                  date: format.dateTime(isoToDate(untilOn), {
                    timeZone: 'UTC',
                    day: '2-digit',
                    month: '2-digit',
                  }),
                })}
                minor={available.obligationsMinor}
                currency={baseCurrency}
              />
              <Row label={translate('total')} minor={available.availableMinor} currency={baseCurrency} total />
            </>
          )}
        </dl>
      </div>
    </section>
  )
}
