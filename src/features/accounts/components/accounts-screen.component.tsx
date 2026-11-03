'use client'

import { ArrowLeftRight, Plus, Wallet } from 'lucide-react'
import type { Route } from 'next'
import Link from 'next/link'
import { useLocale, useTranslations } from 'next-intl'
import { useState } from 'react'
import { Amount, useMoneyText } from '@/components/ui/amount.component'
import { Button } from '@/components/ui/button.component'
import { EmptyState } from '@/components/ui/empty-state.component'
import { ErrorState } from '@/components/ui/error-state.component'
import { Bone } from '@/components/ui/skeleton.component'
import { Tabs } from '@/components/ui/tabs.component'
import { useCanWrite } from '@/contexts/ledger.context'
import { formatRate } from '@/lib/money/fx.utils'
import { useScreenQueryState } from '@/lib/query/screen-query-state.hook'
import { useIsWideLayout } from '@/lib/utils/media-query.hook'
import { useAccounts } from '../hooks/accounts.hook'
import { type AccountView, totalInBase } from '../utils/accounts.utils'
import { AccountFormSheet } from './account-form-sheet.component'
import { AccountRow } from './account-row.component'
import { AdjustBalanceSheet } from './adjust-balance-sheet.component'
import { ArchiveAccountSheet } from './archive-account-sheet.component'
import { RecentTransfers } from './recent-transfers.component'

type Tab = 'active' | 'archived'

type FormTarget = { account: AccountView | null }

// Figma «Saldo» → 2:21073 (desktop) / 2:21278 (mobile) / 5:108630 (empty): a toolbar (gap 12, bottom-aligned) with
// the underline Tabs «Active · N / Archive · N», the primary «Transfer» (the global ?add=transfer sheet) and
// «New account»; one card (padding 8/24/24) holds the rows and «Total in <base currency>». Transfers live in the
// operations feature, the «Latest transfers» card under it reads its own `transfers` rows.
export function AccountsScreen() {
  const translate = useTranslations('accounts')
  const locale = useLocale()
  const moneyText = useMoneyText()
  const canWrite = useCanWrite()
  const desktop = useIsWideLayout()
  const query = useAccounts()
  const { data } = query
  const { failedLoad, retry } = useScreenQueryState([query], translate('refreshFailed'))
  const [tab, setTab] = useState<Tab>('active')
  const [form, setForm] = useState<FormTarget | null>(null)
  const [archiving, setArchiving] = useState<AccountView | null>(null)
  const [adjusting, setAdjusting] = useState<AccountView | null>(null)

  if (failedLoad) {
    return <ErrorState title={translate('loadFailed')} onRetryAction={retry} />
  }

  if (data === undefined) {
    return <Bone className="h-72 rounded-card" />
  }

  const active = data.accounts.filter((account) => account.archivedAt === null)
  const archived = data.accounts.filter((account) => account.archivedAt !== null)
  const shown = tab === 'active' ? active : archived
  const total = totalInBase(data.accounts)
  const list = new Intl.ListFormat(locale, {
    style: 'long',
    type: 'conjunction',
  })
  const currencies = list.format(total.unknownCurrencies)
  // Figma 2:21073: «Total in hryvnia» is the base-currency accounts; the note adds the foreign ones at their rate
  const counted = active.filter((account) => account.includeInTotal)
  const inBase = counted.filter((account) => account.currency === data.baseCurrency)
  const converted = counted.filter((account) => account.currency !== data.baseCurrency && account.baseMinor !== null)
  const baseMinor = inBase.reduce((sum, account) => sum + account.balanceMinor, 0)
  // a converted account has a base value, so it has a rate
  const rateOf = (account: AccountView) => formatRate(account.rate ?? 0, locale)
  const totalLabel = translate('total', { currency: data.baseCurrency })
  const totalNote = [
    inBase.length > 0 ? `${list.format(inBase.map((account) => account.name))}.` : null,
    converted.length > 0
      ? translate('totalWith', {
          count: converted.length,
          accounts: list.format(
            converted.map((account) =>
              translate('totalRate', {
                name: account.name,
                rate: rateOf(account),
              }),
            ),
          ),
          amount: moneyText(total.totalMinor, data.baseCurrency),
        })
      : null,
    total.unknownCurrencies.length > 0 ? translate('totalUnknown', { currencies }) : null,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <>
      {data.accounts.length === 0 ? (
        <EmptyState
          icon={Wallet}
          tone="blue"
          title={translate('empty.title')}
          hint={translate('empty.hint')}
          action={
            canWrite ? <Button onClick={() => setForm({ account: null })}>{translate('empty.action')}</Button> : null
          }
        />
      ) : (
        <>
          {/* Figma 2:21073: tabs, then the buttons, bottom-aligned; 2:21278: the buttons (Transfer stretches) above the tabs */}
          <div className="flex flex-col-reverse gap-4 lg:flex-row lg:items-end lg:gap-3">
            <div className="min-w-0 lg:flex-1">
              <Tabs
                label={translate('tabs.label')}
                value={tab}
                onValueChange={setTab}
                options={[
                  {
                    value: 'active',
                    label: translate('tabs.active', { count: active.length }),
                  },
                  {
                    value: 'archived',
                    label: translate('tabs.archived', { count: archived.length }),
                  },
                ]}
              />
            </div>
            {canWrite ? (
              <div className="flex gap-3">
                <Button
                  render={<Link href={'?add=transfer' as Route} scroll={false} />}
                  nativeButton={false}
                  className="flex-1 lg:flex-none"
                >
                  <ArrowLeftRight className="size-5" aria-hidden />
                  {translate('transfer')}
                </Button>
                <Button variant="secondary" onClick={() => setForm({ account: null })}>
                  <Plus className="size-5" aria-hidden />
                  {translate('new')}
                </Button>
              </div>
            ) : null}
          </div>
          <section className="flex flex-col rounded-card bg-card px-4 pt-1 pb-4 shadow-card lg:px-6 lg:pt-2 lg:pb-6">
            {shown.length === 0 ? (
              <p className="py-8 text-center text-label text-text-secondary">{translate('archivedEmpty')}</p>
            ) : (
              <ul className="flex flex-col">
                {shown.map((account) => (
                  <AccountRow
                    key={account.id}
                    account={account}
                    onEditAction={(target) => setForm({ account: target })}
                    onArchiveAction={setArchiving}
                    onAdjustAction={setAdjusting}
                  />
                ))}
              </ul>
            )}
            {tab === 'active' && desktop ? (
              <div className="flex items-center gap-4 pt-5">
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="text-body font-semibold text-text-primary">{totalLabel}</span>
                  <span className="text-label text-text-secondary">{totalNote}</span>
                </div>
                <Amount minor={baseMinor} currency={data.baseCurrency} size="l" />
              </div>
            ) : null}
            {tab === 'active' && !desktop ? (
              <div className="flex flex-col gap-1 pt-4">
                <div className="flex items-center gap-3">
                  <span className="flex-1 text-body font-semibold text-text-primary">{totalLabel}</span>
                  <Amount minor={baseMinor} currency={data.baseCurrency} size="m" />
                </div>
                <span className="text-caption text-text-secondary">{totalNote}</span>
              </div>
            ) : null}
          </section>
          {tab === 'active' ? <RecentTransfers accounts={data.accounts} /> : null}
        </>
      )}
      <AccountFormSheet
        key={form?.account?.id ?? 'new'}
        open={form !== null}
        onOpenChange={(open) => {
          if (!open) {
            setForm(null)
          }
        }}
        account={form?.account ?? null}
      />
      <ArchiveAccountSheet account={archiving} onCloseAction={() => setArchiving(null)} />
      {adjusting ? (
        <AdjustBalanceSheet key={adjusting.id} account={adjusting} onCloseAction={() => setAdjusting(null)} />
      ) : null}
    </>
  )
}
