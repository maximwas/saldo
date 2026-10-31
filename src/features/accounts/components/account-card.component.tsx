'use client'

import { ChevronLeft } from 'lucide-react'
import type { Route } from 'next'
import Link from 'next/link'
import { useLocale, useTranslations } from 'next-intl'
import { useState } from 'react'
import { Amount } from '@/components/ui/amount.component'
import { Badge } from '@/components/ui/badge.component'
import { Button } from '@/components/ui/button.component'
import { CategoryIcon } from '@/components/ui/category-icon.component'
import { useCanWrite } from '@/contexts/ledger.context'
import { useAccounts } from '../hooks/accounts.hook'
import { ACCOUNT_KIND_STYLE } from '../utils/accounts.utils'
import { AccountFormSheet } from './account-form-sheet.component'
import { ArchiveAccountSheet } from './archive-account-sheet.component'

type AccountCardProps = {
  accountId: string
}

// shortcut: Figma «Saldo» has no frame for the account card; it follows the accounts card (icon, name, meta, number
// typography) with the balance from account_balances and the account's own settings. The operation history of the
// account joins it with the operations feature (1.8).
export function AccountCard({ accountId }: AccountCardProps) {
  const translate = useTranslations('accounts')
  const translateCurrency = useTranslations('currencies')
  const locale = useLocale()
  const canWrite = useCanWrite()
  const { data, isPending, isError } = useAccounts()
  const [editing, setEditing] = useState(false)
  const [archiving, setArchiving] = useState(false)

  if (isPending) {
    return <div aria-busy className="h-72 rounded-card bg-subtle" />
  }

  const account = data?.accounts.find((candidate) => candidate.id === accountId)

  if (isError || !account) {
    return (
      <p role="alert" className="text-body text-negative-text">
        {translate(isError ? 'loadFailed' : 'card.notFound')}
      </p>
    )
  }

  const style = ACCOUNT_KIND_STYLE[account.kind]
  const archived = account.archivedAt !== null
  const date = new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(
    new Date(`${account.openingBalanceOn}T12:00:00`),
  )
  const yesNo = (flag: boolean) => translate(flag ? 'card.yes' : 'card.no')

  return (
    <>
      <Link
        href={'/operations/accounts' as Route}
        className="flex w-fit cursor-pointer items-center gap-1 rounded-xs text-label font-medium text-primary-text outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <ChevronLeft className="size-4" aria-hidden />
        {translate('card.back')}
      </Link>
      <section className="flex flex-col gap-6 rounded-card bg-card p-5 shadow-card lg:p-6">
        <header className="flex items-center gap-4">
          <CategoryIcon icon={account.icon ?? style.icon} color={account.color ?? style.color} />
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <h2 className="truncate text-card-title text-text-primary">{account.name}</h2>
            <span className="text-label text-text-secondary">
              {translate(`kind.${account.kind}`)} · {translateCurrency(`names.${account.currency as 'UAH'}`)}
            </span>
          </div>
          {archived ? <Badge tone="muted">{translate('archivedBadge')}</Badge> : null}
        </header>
        <div className="flex flex-col gap-1">
          <span className="text-label text-text-secondary">{translate('card.balance')}</span>
          <Amount minor={account.balanceMinor} currency={account.currency} size="xl" />
          {account.currency !== data.baseCurrency ? (
            <span className="text-label text-text-tertiary">
              {account.baseMinor === null ? (
                translate('noRate')
              ) : (
                <>
                  ≈ <Amount minor={account.baseMinor} currency={data.baseCurrency} className="text-label" />
                </>
              )}
            </span>
          ) : null}
        </div>
        <dl className="grid gap-x-6 gap-y-3 text-body sm:grid-cols-2">
          <div className="flex justify-between gap-3 border-b border-border pb-3">
            <dt className="text-text-secondary">{translate('card.opening', { date })}</dt>
            <dd>
              <Amount minor={account.openingBalanceMinor} currency={account.currency} className="font-medium" />
            </dd>
          </div>
          <div className="flex justify-between gap-3 border-b border-border pb-3">
            <dt className="text-text-secondary">{translate('inTotal')}</dt>
            <dd className="font-medium text-text-primary">{yesNo(account.includeInTotal)}</dd>
          </div>
          <div className="flex justify-between gap-3 border-b border-border pb-3">
            <dt className="text-text-secondary">{translate('inAvailable')}</dt>
            <dd className="font-medium text-text-primary">{yesNo(account.includeInAvailable)}</dd>
          </div>
        </dl>
        {canWrite && !archived ? (
          <div className="flex flex-wrap gap-3">
            <Button variant="secondary" onClick={() => setEditing(true)}>
              {translate('menu.edit')}
            </Button>
            <Button variant="danger" onClick={() => setArchiving(true)}>
              {translate('menu.archive')}
            </Button>
          </div>
        ) : null}
      </section>
      <AccountFormSheet open={editing} onOpenChange={setEditing} account={account} />
      <ArchiveAccountSheet account={archiving ? account : null} onCloseAction={() => setArchiving(false)} />
    </>
  )
}
