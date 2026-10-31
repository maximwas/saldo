'use client'

import { Archive, ArchiveRestore, Pencil, Scale, Trash2 } from 'lucide-react'
import type { Route } from 'next'
import Link from 'next/link'
import { useLocale, useTranslations } from 'next-intl'
import { useState } from 'react'
import { Amount } from '@/components/ui/amount.component'
import { Badge } from '@/components/ui/badge.component'
import { CategoryIcon } from '@/components/ui/category-icon.component'
import { ActionSheet, Menu, type MenuItem } from '@/components/ui/menu.component'
import { useRipple } from '@/components/ui/ripple.hook'
import { useIsDesktop } from '@/components/ui/sheet.component'
import { Switch } from '@/components/ui/switch.component'
import { useCanWrite, useLedgerStore } from '@/contexts/ledger.context'
import { formatMinor } from '@/lib/money/money.utils'
import { useUpdateAccount } from '../hooks/accounts.hook'
import { ACCOUNT_KIND_STYLE, type AccountView } from '../utils/accounts.utils'

type AccountRowProps = {
  account: AccountView
  onEditAction: (account: AccountView) => void
  onArchiveAction: (account: AccountView) => void
  onAdjustAction: (account: AccountView) => void
}

// Figma «Saldo» → 2:21073 (desktop): row padding 16/0, gap 16, border-bottom; icon 40, name body-medium + meta label,
// «In balance» 160 and «In available» 180 switches, balance 180 right-aligned (number-sm) with «≈ base · rate» under a
// foreign one, the «···» menu 15:85158. 2:21278 (mobile): padding 12/0, gap 8 — a head (icon, name that never wraps,
// balance body-medium with «≈ base» under it), the switches stacked under it from 48; no «···»: tapping the head opens
// the actions sheet 15:85404.
export function AccountRow({ account, onEditAction, onArchiveAction, onAdjustAction }: AccountRowProps) {
  const translate = useTranslations('accounts')
  const translateCurrency = useTranslations('currencies')
  const locale = useLocale()
  const desktop = useIsDesktop()
  const baseCurrency = useLedgerStore((ledger) => ledger.baseCurrency)
  const canWrite = useCanWrite()
  const update = useUpdateAccount()
  const [sheetOpen, setSheetOpen] = useState(false)
  const { pressProps, ripple } = useRipple()
  const archived = account.archivedAt !== null
  const style = ACCOUNT_KIND_STYLE[account.kind]
  const foreign = account.currency !== baseCurrency
  const kindAndCurrency = `${translate(`kind.${account.kind}`)} · ${translateCurrency(`names.${account.currency as 'UAH'}`)}`

  const setFlag = (patch: { include_in_total: boolean } | { include_in_available: boolean }) =>
    update.mutate({
      id: account.id,
      expectedVersion: account.version,
      patch,
    })

  const items: MenuItem[] = archived
    ? [
        {
          label: translate('menu.restore'),
          Icon: ArchiveRestore,
          onSelect: () =>
            update.mutate({
              id: account.id,
              expectedVersion: account.version,
              patch: { archived_at: null },
            }),
        },
      ]
    : [
        {
          label: translate('menu.edit'),
          Icon: Pencil,
          onSelect: () => onEditAction(account),
        },
        {
          label: translate('menu.adjust'),
          Icon: Scale,
          onSelect: () => onAdjustAction(account),
        },
        {
          label: translate('menu.archive'),
          Icon: Archive,
          onSelect: () => onArchiveAction(account),
        },
        // Figma 5:106214 «delete → archive»: an account is never deleted, the dialog offers archiving
        {
          label: translate('menu.delete'),
          Icon: Trash2,
          onSelect: () => onArchiveAction(account),
          danger: true,
        },
      ]

  const switches = archived ? null : (
    <>
      <Switch
        label={translate('inTotal')}
        checked={account.includeInTotal}
        disabled={!canWrite}
        onCheckedChange={(checked) => setFlag({ include_in_total: checked })}
        className={desktop ? 'w-40' : 'w-full'}
      />
      <Switch
        label={translate('inAvailable')}
        checked={account.includeInAvailable}
        disabled={!canWrite}
        onCheckedChange={(checked) => setFlag({ include_in_available: checked })}
        className={desktop ? 'w-45' : 'w-full'}
      />
    </>
  )
  const convertedText = () => {
    if (account.baseMinor === null) {
      return translate('noRate')
    }

    const amount = formatMinor(account.baseMinor, baseCurrency, locale)

    return desktop
      ? translate('converted', {
          amount,
          rate: new Intl.NumberFormat(locale, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 4,
          }).format(Number(account.rate)),
        })
      : translate('convertedShort', { amount })
  }
  const converted = foreign ? <span className="text-caption text-text-tertiary">{convertedText()}</span> : null

  if (desktop) {
    return (
      <li className="relative flex items-center gap-4 overflow-hidden border-b border-border py-4 transition-colors hover:bg-subtle">
        <CategoryIcon icon={account.icon ?? style.icon} color={account.color ?? style.color} />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <Link
            href={`/operations/accounts/${account.id}` as Route}
            className="cursor-pointer truncate rounded-xs text-body font-medium text-text-primary outline-none after:absolute after:inset-0 focus-visible:ring-2 focus-visible:ring-primary"
            {...pressProps}
          >
            {account.name}
            {ripple}
          </Link>
          <span className="truncate text-label text-text-secondary">
            {kindAndCurrency}
            {account.includeInAvailable || archived ? null : ` · ${translate('notInAvailable')}`}
          </span>
        </div>
        {archived ? <Badge tone="muted">{translate('archivedBadge')}</Badge> : null}
        <div className="relative flex items-center gap-4">{switches}</div>
        <div className="flex w-45 shrink-0 flex-col items-end gap-0.5">
          <Amount minor={account.balanceMinor} currency={account.currency} size="m" />
          {converted}
        </div>
        {canWrite ? (
          <div className="relative">
            <Menu label={translate('menu.label')} items={items} />
          </div>
        ) : null}
      </li>
    )
  }

  const head = (
    <>
      <CategoryIcon icon={account.icon ?? style.icon} color={account.color ?? style.color} />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-body font-medium text-text-primary">{account.name}</span>
        <span className="truncate text-label text-text-secondary">
          {account.includeInAvailable || archived ? kindAndCurrency : translate('notInAvailableMobile')}
        </span>
      </span>
      {archived ? <Badge tone="muted">{translate('archivedBadge')}</Badge> : null}
      <span className="flex shrink-0 flex-col items-end gap-0.5">
        <Amount minor={account.balanceMinor} currency={account.currency} size="s" />
        {converted}
      </span>
    </>
  )

  return (
    <li className="flex flex-col gap-2 border-b border-border py-3">
      {canWrite ? (
        <button
          type="button"
          aria-label={`${account.name}: ${translate('menu.label')}`}
          onClick={() => setSheetOpen(true)}
          className="relative -mx-3 -my-1 flex cursor-pointer items-center gap-3 overflow-hidden rounded-md px-3 py-1 text-left outline-none transition-colors hover:bg-subtle focus-visible:ring-2 focus-visible:ring-primary"
          {...pressProps}
        >
          {head}
          {ripple}
        </button>
      ) : (
        <div className="flex items-center gap-3">{head}</div>
      )}
      {switches ? <div className="flex flex-col pl-12">{switches}</div> : null}
      {canWrite ? (
        <ActionSheet open={sheetOpen} onOpenChange={setSheetOpen} title={account.name} items={items} />
      ) : null}
    </li>
  )
}
