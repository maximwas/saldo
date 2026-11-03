'use client'

import { useLocale, useTranslations } from 'next-intl'
import { useState } from 'react'
import { Bone } from '@/components/ui/skeleton.component'
import { useDayText } from '@/lib/dates/day-text.hook'
import { formatRate } from '@/lib/money/fx.utils'
import { currencyName, currencySymbol } from '@/lib/money/money.utils'
import { useRateBoard } from '../hooks/currencies.hook'
import { boardDigits, splitBoard } from '../utils/currencies.utils'
import { RatesSheet } from './rates-sheet.component'

const STRIP_CLASS = 'flex w-full items-center gap-3 rounded-full border border-border bg-card px-4 py-3'

// Figma «Saldo» → Overview · Rates, option B (phone 50:122084): a pill above the hero, «$ 41,60 € 41,50 zł 9,65» (the
// symbol caption tertiary, the rate label-semibold) and «rates on 03.11» on the right; a tap opens the all-rates
// sheet. The Rates card shows the errors and their toast; a first load that failed shows a retry here too
export function RatesStrip() {
  const translate = useTranslations('currencies.board')
  const locale = useLocale()
  const dayText = useDayText()
  const { queries, data, save } = useRateBoard()
  const [open, setOpen] = useState(false)

  if (queries.some((query) => query.isLoadingError)) {
    return (
      <div role="alert" className={STRIP_CLASS}>
        <span className="flex-1 text-label text-text-secondary">{translate('strip.failed')}</span>
        <button
          type="button"
          onClick={() => {
            for (const query of queries) {
              void query.refetch()
            }
          }}
          className="cursor-pointer rounded-xs text-label font-medium text-primary-text outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          {translate('strip.retry')}
        </button>
      </div>
    )
  }

  if (data === undefined) {
    return <Bone aria-busy className="h-11 w-full rounded-full" />
  }

  const { shown } = splitBoard(data.board, data.pinned, (currency) => currencyName(currency, locale))

  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
        className={`${STRIP_CLASS} cursor-pointer text-left`}
      >
        {shown.length === 0 ? (
          <span className="text-label text-text-secondary">{translate('card.nonePinned')}</span>
        ) : (
          shown.map((row) => (
            <span key={row.currency} className="flex items-baseline gap-1">
              <span className="text-caption text-text-tertiary">{currencySymbol(row.currency, locale)}</span>
              <span className="text-label font-semibold text-text-primary tabular-nums">
                {row.rate === null ? '?' : formatRate(row.rate, locale, boardDigits(row.rate))}
              </span>
            </span>
          ))
        )}
        <span className="flex-1 text-right text-caption text-text-tertiary">
          {data.nbuDay
            ? translate('strip.date', {
                date: dayText(data.nbuDay, 'short'),
              })
            : null}
        </span>
      </button>
      {open ? (
        <RatesSheet
          onOpenChange={setOpen}
          baseCurrency={data.baseCurrency}
          board={data.board}
          pinned={data.pinned}
          nbuDay={data.nbuDay}
          onPinnedChange={save}
        />
      ) : null}
    </>
  )
}
