'use client'

import { ArrowLeftRight } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { Amount } from '@/components/ui/amount.component'
import { Card } from '@/components/ui/card.component'
import { useIsDesktop } from '@/components/ui/sheet.component'
import { NEUTRAL_TONE } from '@/constants/category-colors.constants'
import { useLedger } from '@/contexts/ledger.context'
import { formatMinor } from '@/lib/money/money.utils'
import { useUiStore } from '@/store/ui.store'
import { useRecentTransfers } from '../hooks/accounts.hook'
import { type AccountView, type RecentTransfer, transferRate } from '../utils/accounts.utils'

const ALL_TRANSFERS_HREF = '/operations?type=transfer&period=all'

type RecentTransfersProps = {
  accounts: AccountView[]
}

// Figma «Saldo» → Card / transfers 2:21251 (desktop) / 2:21383 (mobile): a Card (action «All transfers» / «All») with
// up to three transfers — desktop: TableRow 64 high (date 72, neutral 32 icon, title + «Rate · fee», category 160,
// «From → To» 180, «−800 € → +33 200 ₴» 260 right), mobile: ListItem (neutral 40 icon, title, «From → To», the sent
// amount with the received one under it) — and the note that a transfer is neither spending nor income
export function RecentTransfers({ accounts }: RecentTransfersProps) {
  const translate = useTranslations('accounts.recent')
  const locale = useLocale()
  const desktop = useIsDesktop()
  const { timeZone } = useLedger()
  const hideAmounts = useUiStore((state) => state.hideAmounts)
  const { data } = useRecentTransfers()

  if (!data || data.length === 0) {
    return null
  }

  const nameOf = (id: string) => accounts.find((account) => account.id === id)?.name ?? '—'
  const route = (transfer: RecentTransfer) => `${nameOf(transfer.fromAccountId)} → ${nameOf(transfer.toAccountId)}`
  const dayOf = (transfer: RecentTransfer) =>
    new Intl.DateTimeFormat(locale, {
      day: '2-digit',
      month: '2-digit',
      timeZone,
    }).format(new Date(transfer.occurredAt))

  function meta(transfer: RecentTransfer) {
    const rate = transferRate(transfer)
    const fee =
      transfer.feeMinor === null
        ? translate('noFee')
        : translate('fee', { amount: formatMinor(transfer.feeMinor, transfer.fromCurrency, locale) })

    if (rate === null) {
      return fee
    }

    const formatted = new Intl.NumberFormat(locale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    }).format(rate)

    return `${translate('rate', { rate: formatted })} · ${fee}`
  }

  const received = (transfer: RecentTransfer) =>
    hideAmounts ? '→ ••••' : `→ +${formatMinor(transfer.toAmountMinor, transfer.toCurrency, locale)}`

  const sent = (transfer: RecentTransfer) => (
    <Amount minor={-transfer.fromAmountMinor} currency={transfer.fromCurrency} kind="transfer" />
  )

  const icon = (size: string) => (
    <span aria-hidden className={`flex shrink-0 items-center justify-center rounded-full ${size} ${NEUTRAL_TONE}`}>
      <ArrowLeftRight className="size-4" />
    </span>
  )

  return (
    <Card
      title={translate('title')}
      action={{
        label: translate(desktop ? 'all' : 'allShort'),
        href: ALL_TRANSFERS_HREF,
      }}
      className="gap-3 lg:gap-5"
    >
      <div className="flex flex-col gap-4">
        <ul className="flex flex-col lg:gap-4">
          {data.map((transfer) =>
            desktop ? (
              <li key={transfer.id} className="flex h-16 items-center gap-4 border-b border-border bg-card px-4">
                <span className="w-18 shrink-0 text-label text-text-secondary">{dayOf(transfer)}</span>
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  {icon('size-8')}
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="truncate text-body font-medium text-text-primary">
                      {transfer.note ?? translate('untitled')}
                    </span>
                    <span className="truncate text-label text-text-secondary">{meta(transfer)}</span>
                  </div>
                </div>
                <span className="w-40 shrink-0 text-label text-text-secondary">{translate('category')}</span>
                <span className="w-45 shrink-0 truncate text-label text-text-secondary">{route(transfer)}</span>
                <span className="flex w-65 shrink-0 items-baseline justify-end gap-1">
                  {sent(transfer)}
                  <span className="text-body font-medium whitespace-nowrap text-text-tertiary tabular-nums">
                    {received(transfer)}
                  </span>
                </span>
              </li>
            ) : (
              <li key={transfer.id} className="flex items-center gap-4 py-3">
                {icon('size-10')}
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="truncate text-body font-medium text-text-primary">
                    {transfer.note ?? translate('untitled')}
                  </span>
                  <span className="truncate text-label text-text-secondary">{route(transfer)}</span>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-0.5">
                  {sent(transfer)}
                  <span className="text-label text-text-secondary tabular-nums">{received(transfer)}</span>
                </div>
              </li>
            ),
          )}
        </ul>
        <p className="text-caption text-text-tertiary">{translate('note')}</p>
      </div>
    </Card>
  )
}
