'use client'

import { Search } from 'lucide-react'
import type { Route } from 'next'
import Link from 'next/link'
import { useLocale, useTranslations } from 'next-intl'
import { useState } from 'react'
import { Badge } from '@/components/ui/badge.component'
import { Button } from '@/components/ui/button.component'
import { Checkbox } from '@/components/ui/checkbox.component'
import { EmptyState } from '@/components/ui/empty-state.component'
import { Input } from '@/components/ui/input.component'
import { LetterAvatar } from '@/components/ui/service-logo.component'
import { Sheet, SheetClose } from '@/components/ui/sheet.component'
import { useDayText } from '@/lib/dates/day-text.hook'
import { formatRate } from '@/lib/money/fx.utils'
import { currencyName, currencySymbol } from '@/lib/money/money.utils'
import { useIsSheetDialog } from '@/lib/utils/media-query.hook'
import { MAX_PINNED } from '../hooks/currencies.hook'
import { type BoardRate, boardDigits, rateColor, splitBoard } from '../utils/currencies.utils'
import { RateFigures } from './rate-figures.component'

type RatesSheetProps = {
  onOpenChange: (open: boolean) => void
  baseCurrency: string
  board: BoardRate[]
  /** the member's pins without the base currency, in their order */
  pinned: string[]
  nbuDay: string | null
  onPinnedChange: (currencies: string[]) => void
}

// Figma «Saldo» → Rates · All rates: Dialog 560 on desktop (50:122579), BottomSheet on the phone (50:123557). A hint, a
// search, the pinned group «On the overview · N» and «Other NBU rates · N»; a row is a 44 high label with a Checkbox,
// a LetterAvatar 32 with the symbol, the name, «USD · NBU 03.11» (a manual rate: the «manual» pill, its day and NBU's rate),
// the rate and the day's change, whose column says «change for the day» quietly by the group title. A tick saves at once;
// at three pins the other boxes are disabled with a plain hint. The phone hint says «tap», the desktop one «tick»
export function RatesSheet({ onOpenChange, baseCurrency, board, pinned, nbuDay, onPinnedChange }: RatesSheetProps) {
  const translate = useTranslations('currencies.board')
  const translateCurrencies = useTranslations('currencies')
  const locale = useLocale()
  const dayText = useDayText()
  const desktop = useIsSheetDialog()
  const [search, setSearch] = useState('')
  const nameOf = (currency: string) => currencyName(currency, locale)
  const { shown, others } = splitBoard(board, pinned, nameOf)
  // colours by place in the whole list, so a search does not repaint the rows
  const colors = new Map([...shown, ...others].map((row, index) => [row.currency, rateColor(index)]))
  const needle = search.trim().toLocaleLowerCase(locale)
  const matches = (row: BoardRate) =>
    row.currency.toLocaleLowerCase(locale).includes(needle) ||
    nameOf(row.currency).toLocaleLowerCase(locale).includes(needle)
  const shownMatches = shown.filter(matches)
  const otherMatches = others.filter(matches)
  const full = pinned.length >= MAX_PINNED

  function metaOf(row: BoardRate) {
    if (row.rateOn === null) {
      return row.currency
    }

    if (!row.manual) {
      return translate('meta', {
        code: row.currency,
        date: dayText(row.rateOn, 'short'),
      })
    }

    return row.nbuRate === null
      ? translate('metaManualOnly', {
          code: row.currency,
          date: dayText(row.rateOn, 'short'),
        })
      : translate('metaManual', {
          code: row.currency,
          date: dayText(row.rateOn, 'short'),
          nbu: formatRate(row.nbuRate, locale, boardDigits(row.nbuRate)),
        })
  }

  function renderGroup(title: string, rows: BoardRate[], note: string | null = null) {
    return (
      <>
        <div className="flex items-baseline justify-between gap-3 pt-2">
          <h3 className="text-label font-medium text-text-secondary">{title}</h3>
          {/* each figure has the same words for a screen reader */}
          <span aria-hidden className="text-caption text-text-tertiary">
            {translate('card.change')}
          </span>
        </div>
        {note ? <p className="text-label text-text-tertiary">{note}</p> : null}
        <ul className="flex flex-col">{rows.map(renderRow)}</ul>
      </>
    )
  }

  function renderRow(row: BoardRate) {
    const checked = pinned.includes(row.currency)

    return (
      <li key={row.currency} className="border-b border-border py-1 last:border-b-0">
        <label
          htmlFor={`pin-${row.currency}`}
          className="flex min-h-11 cursor-pointer items-center gap-3 has-data-disabled:cursor-not-allowed"
        >
          <Checkbox
            id={`pin-${row.currency}`}
            checked={checked}
            disabled={!checked && full}
            onCheckedChange={(next) =>
              onPinnedChange(next ? [...pinned, row.currency] : pinned.filter((currency) => currency !== row.currency))
            }
          />
          <LetterAvatar
            name={row.currency}
            letter={currencySymbol(row.currency, locale)}
            color={colors.get(row.currency)}
            size={32}
          />
          <span className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="truncate text-body font-medium text-text-primary">{nameOf(row.currency)}</span>
            <span className="flex flex-wrap items-center gap-2 text-label text-text-secondary">
              {row.manual ? <Badge tone="info">{translateCurrencies('source.manual')}</Badge> : null}
              <span>{metaOf(row)}</span>
            </span>
          </span>
          <RateFigures row={row} baseCurrency={baseCurrency} changeClassName="text-text-tertiary" />
        </label>
      </li>
    )
  }

  return (
    <Sheet
      open
      onOpenChange={onOpenChange}
      title={translate('sheet.title')}
      size="list"
      footer={
        <>
          <Button variant="secondary" render={<Link href={'/settings/currencies' as Route} />} nativeButton={false}>
            {translate('sheet.settings')}
          </Button>
          {/* the phone sheet closes with ✕ or a swipe (50:123557 has no «Done») */}
          {desktop ? <SheetClose variant="primary">{translate('sheet.done')}</SheetClose> : null}
        </>
      }
    >
      <p className="text-label text-text-secondary">
        {nbuDay === null
          ? translate('sheet.hintNoDate')
          : translate('sheet.hint', {
              date: dayText(nbuDay, 'short'),
              base: baseCurrency,
            })}{' '}
        {translate(desktop ? 'sheet.pick' : 'sheet.pickPhone')}
      </p>
      <Input
        type="search"
        aria-label={translate('sheet.search')}
        placeholder={translate('sheet.searchPlaceholder')}
        value={search}
        onChange={(event) => setSearch(event.target.value)}
      />
      {shownMatches.length === 0 && otherMatches.length === 0 ? (
        <EmptyState
          bare
          icon={Search}
          tone="neutral"
          title={translate('sheet.notFound')}
          hint={translate('sheet.notFoundHint')}
        />
      ) : (
        <div className="flex flex-col gap-1">
          {shownMatches.length > 0
            ? renderGroup(
                translate('sheet.pinned', { count: shown.length }),
                shownMatches,
                full ? translate('sheet.limit') : null,
              )
            : null}
          {otherMatches.length > 0
            ? renderGroup(translate('sheet.others', { count: others.length }), otherMatches)
            : null}
        </div>
      )}
    </Sheet>
  )
}
