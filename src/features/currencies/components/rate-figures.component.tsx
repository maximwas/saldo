'use client'

import { useLocale, useTranslations } from 'next-intl'
import { Badge } from '@/components/ui/badge.component'
import { formatRate, formatRateChange } from '@/lib/money/fx.utils'
import { currencySymbol } from '@/lib/money/money.utils'
import { cn } from '@/lib/utils/cn.utils'
import { type BoardRate, boardDigits } from '../utils/currencies.utils'

type RateFiguresProps = {
  row: BoardRate
  baseCurrency: string
  /** the change line: label secondary on the card (50:121456), label tertiary in the sheet (50:123403) */
  changeClassName: string
}

// the trailing block of a rate row: «41,60 ₴» in body-medium and the day's change under it; no rate is the «no rate» badge,
// never 0, and no earlier rate shows no change at all
export function RateFigures({ row, baseCurrency, changeClassName }: RateFiguresProps) {
  const translate = useTranslations('currencies.board')
  const locale = useLocale()

  if (row.rate === null) {
    return <Badge tone="unknown">{translate('noRate')}</Badge>
  }

  const digits = boardDigits(row.rate)

  return (
    <span className="flex shrink-0 flex-col items-end gap-0.5 text-right">
      <span className="text-body font-medium text-text-primary tabular-nums">
        {formatRate(row.rate, locale, digits)} {currencySymbol(baseCurrency, locale)}
      </span>
      {row.change === null ? null : (
        <span className={cn('text-label tabular-nums', changeClassName)}>
          <span className="sr-only">{translate('card.change')} </span>
          {formatRateChange(row.change, locale, digits)}
        </span>
      )}
    </span>
  )
}
