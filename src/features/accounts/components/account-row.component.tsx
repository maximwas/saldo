'use client'

import type { Route } from 'next'
import Link from 'next/link'
import { useLocale, useTranslations } from 'next-intl'
import { Amount } from '@/components/ui/amount.component'
import { Badge } from '@/components/ui/badge.component'
import { CategoryIcon } from '@/components/ui/category-icon.component'
import { Menu, type MenuItem } from '@/components/ui/menu.component'
import { Switch } from '@/components/ui/switch.component'
import { formatMinor } from '@/lib/money/money.utils'
import { useUpdateAccount } from '../hooks/accounts.hook'
import { ACCOUNT_KIND_STYLE, type AccountView } from '../utils/accounts.utils'

type AccountRowProps = {
  account: AccountView
  baseCurrency: string
  canWrite: boolean
  onEditAction: (account: AccountView) => void
  onArchiveAction: (account: AccountView) => void
}

// Figma «Saldo» → 2:21073 / 2:21278: row padding 16/0, gap 16, border-bottom; icon 40, name body-medium + meta
// label, «In balance» 160 and «In available» 180 switches, balance 180 right-aligned (number-sm) with the
// converted line under a foreign balance, a 44 «···» menu. On mobile the switches drop under the row, full width.
export function AccountRow({ account, baseCurrency, canWrite, onEditAction, onArchiveAction }: AccountRowProps) {
  const translate = useTranslations('accounts')
  const translateCurrency = useTranslations('currencies')
  const locale = useLocale()
  const update = useUpdateAccount()
  const archived = account.archivedAt !== null
  const style = ACCOUNT_KIND_STYLE[account.kind]
  const foreign = account.currency !== baseCurrency

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
          onSelect: () => onEditAction(account),
        },
        {
          label: translate('menu.archive'),
          onSelect: () => onArchiveAction(account),
          danger: true,
        },
      ]

  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-border py-4 lg:flex-nowrap">
      <CategoryIcon icon={account.icon ?? style.icon} color={account.color ?? style.color} />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <Link
          href={`/operations/accounts/${account.id}` as Route}
          className="cursor-pointer truncate rounded-xs text-body font-medium text-text-primary outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          {account.name}
        </Link>
        <span className="text-label text-text-secondary">
          {translate(`kind.${account.kind}`)} · {translateCurrency(`names.${account.currency as 'UAH'}`)}
          {account.includeInAvailable || archived ? null : ` · ${translate('notInAvailable')}`}
        </span>
      </div>
      {archived ? <Badge tone="muted">{translate('archivedBadge')}</Badge> : null}
      {archived ? null : (
        <div className="order-last flex w-full flex-col lg:order-0 lg:w-auto lg:flex-row lg:gap-4">
          <Switch
            label={translate('inTotal')}
            checked={account.includeInTotal}
            disabled={!canWrite}
            onCheckedChange={(checked) => setFlag({ include_in_total: checked })}
            className="lg:w-40"
          />
          <Switch
            label={translate('inAvailable')}
            checked={account.includeInAvailable}
            disabled={!canWrite}
            onCheckedChange={(checked) => setFlag({ include_in_available: checked })}
            className="lg:w-45"
          />
        </div>
      )}
      <div className="flex flex-col items-end gap-0.5 lg:w-45">
        <Amount minor={account.balanceMinor} currency={account.currency} size="m" />
        {foreign ? (
          <span className="text-caption text-text-tertiary">
            {account.baseMinor === null
              ? translate('noRate')
              : translate('converted', {
                  amount: formatMinor(account.baseMinor, baseCurrency, locale),
                  rate: new Intl.NumberFormat(locale, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 4,
                  }).format(Number(account.rate)),
                })}
          </span>
        ) : null}
      </div>
      {canWrite ? <Menu label={translate('menu.label')} items={items} /> : null}
    </li>
  )
}
