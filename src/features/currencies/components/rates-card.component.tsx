'use client'

import { Coins } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { useState } from 'react'
import { Card } from '@/components/ui/card.component'
import { EmptyState } from '@/components/ui/empty-state.component'
import { ErrorState } from '@/components/ui/error-state.component'
import { LetterAvatar } from '@/components/ui/service-logo.component'
import { Bone, SkeletonCard, SkeletonLine } from '@/components/ui/skeleton.component'
import { useDayText } from '@/lib/dates/day-text.hook'
import { currencyName, currencySymbol } from '@/lib/money/money.utils'
import { useScreenQueryState } from '@/lib/query/screen-query-state.hook'
import { useRateBoard } from '../hooks/currencies.hook'
import { rateColor, splitBoard } from '../utils/currencies.utils'
import { RateFigures } from './rate-figures.component'
import { RatesSheet } from './rates-sheet.component'

// Figma «Saldo» → Overview · Rates, option A (desktop 50:120347, three currencies 50:120970): the «Rates» Card under
// «Accounts», «All rates ›» opens the all-rates dialog. ListItem rows (padding 12/0, gap 16): LetterAvatar 40 with the
// symbol, the name, «USD» or «EUR · manual», the rate and the day's change; under a border «NBU on 03.11» and
// «change for the day». This card owns the rates' error toast: the phone strip reads the same queries silently
export function RatesCard() {
  const translate = useTranslations('currencies.board')
  const translateCurrencies = useTranslations('currencies')
  const locale = useLocale()
  const dayText = useDayText()
  const { queries, data, save } = useRateBoard()
  const { failedLoad, retry } = useScreenQueryState(queries, translateCurrencies('refreshFailed'))
  const [open, setOpen] = useState(false)

  if (failedLoad) {
    return <ErrorState title={translateCurrencies('loadFailed')} onRetryAction={retry} />
  }

  if (data === undefined) {
    return (
      <SkeletonCard aria-busy className="gap-5 p-5 lg:p-6">
        <Bone className="h-5 w-30 rounded-sm" />
        <SkeletonLine />
        <SkeletonLine />
      </SkeletonCard>
    )
  }

  const nameOf = (currency: string) => currencyName(currency, locale)
  const { shown } = splitBoard(data.board, data.pinned, nameOf)
  const anyRate = data.board.some((row) => row.rate !== null)
  const { baseCurrency, nbuDay } = data

  function body() {
    if (!anyRate) {
      return (
        <EmptyState
          bare
          icon={Coins}
          tone="neutral"
          title={translate('card.empty')}
          hint={translate('card.emptyHint')}
        />
      )
    }

    if (shown.length === 0) {
      return (
        <EmptyState
          bare
          icon={Coins}
          tone="neutral"
          title={translate('card.nonePinned')}
          hint={translate('card.nonePinnedHint')}
        />
      )
    }

    return (
      <>
        <ul className="flex flex-col">
          {shown.map((row, index) => (
            <li key={row.currency} className="flex items-center gap-4 py-3">
              <LetterAvatar
                name={row.currency}
                letter={currencySymbol(row.currency, locale)}
                color={rateColor(index)}
              />
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <p className="truncate text-body font-medium text-text-primary">{nameOf(row.currency)}</p>
                <p className="text-label text-text-secondary">
                  {row.manual ? `${row.currency} · ${translateCurrencies('source.manual')}` : row.currency}
                </p>
              </div>
              <RateFigures row={row} baseCurrency={baseCurrency} changeClassName="text-text-secondary" />
            </li>
          ))}
        </ul>
        <div className="flex items-center justify-between gap-3 border-t border-border pt-4 text-label">
          <span className="text-text-secondary">
            {nbuDay
              ? translate('card.nbuOn', {
                  date: dayText(nbuDay, 'short'),
                })
              : null}
          </span>
          <span className="text-text-tertiary">{translate('card.change')}</span>
        </div>
      </>
    )
  }

  return (
    <>
      <Card
        title={translate('card.title')}
        action={{
          label: translate('card.all'),
          onClickAction: () => setOpen(true),
        }}
      >
        {body()}
      </Card>
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
