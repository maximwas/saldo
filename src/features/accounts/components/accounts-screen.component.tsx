'use client'

import { ArrowLeftRight, Plus, Wallet } from 'lucide-react'
import type { Route } from 'next'
import Link from 'next/link'
import { useLocale, useTranslations } from 'next-intl'
import { useState } from 'react'
import { Amount } from '@/components/ui/amount.component'
import { Button } from '@/components/ui/button.component'
import { Tabs } from '@/components/ui/tabs.component'
import { useCanWrite } from '@/contexts/ledger.context'
import { useAccounts } from '../hooks/accounts.hook'
import { type AccountView, totalInBase } from '../utils/accounts.utils'
import { AccountFormSheet } from './account-form-sheet.component'
import { AccountRow } from './account-row.component'
import { AdjustBalanceSheet } from './adjust-balance-sheet.component'
import { ArchiveAccountSheet } from './archive-account-sheet.component'

type Tab = 'active' | 'archived'

type FormTarget = { account: AccountView | null }

// Figma «Saldo» → 2:21073 (desktop) / 2:21278 (mobile) / 5:108630 (empty): a toolbar (gap 12, bottom-aligned) with
// the underline Tabs «Active · N / Archive · N», the primary «Transfer» (the global ?add=transfer sheet) and
// «New account»; one card (padding 8/24/24) holds the rows and «Total in <base currency>». Transfers live in the
// operations feature, so the «Latest transfers» card of the frame is not here.
export function AccountsScreen() {
  const translate = useTranslations('accounts')
  const locale = useLocale()
  const canWrite = useCanWrite()
  const { data, isPending, isError } = useAccounts()
  const [tab, setTab] = useState<Tab>('active')
  const [form, setForm] = useState<FormTarget | null>(null)
  const [archiving, setArchiving] = useState<AccountView | null>(null)
  const [adjusting, setAdjusting] = useState<AccountView | null>(null)

  if (isPending) {
    return <div aria-busy className="h-72 rounded-card bg-subtle" />
  }

  if (isError) {
    return (
      <p role="alert" className="text-body text-negative-text">
        {translate('loadFailed')}
      </p>
    )
  }

  const active = data.accounts.filter((account) => account.archivedAt === null)
  const archived = data.accounts.filter((account) => account.archivedAt !== null)
  const shown = tab === 'active' ? active : archived
  const total = totalInBase(data.accounts)
  const currencies = new Intl.ListFormat(locale, {
    style: 'short',
    type: 'conjunction',
  }).format(total.unknownCurrencies)

  return (
    <>
      {data.accounts.length === 0 ? (
        <section className="flex flex-col items-center gap-3 rounded-card bg-card px-5 py-12 text-center shadow-card">
          <span
            aria-hidden
            className="flex size-10 items-center justify-center rounded-full bg-primary-soft text-primary-text"
          >
            <Wallet className="size-5" />
          </span>
          <h2 className="text-card-title text-text-primary">{translate('empty.title')}</h2>
          <p className="max-w-sm text-label text-text-secondary">{translate('empty.hint')}</p>
          {canWrite ? <Button onClick={() => setForm({ account: null })}>{translate('empty.action')}</Button> : null}
        </section>
      ) : (
        <>
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-0 flex-1">
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
              <Button render={<Link href={'?add=transfer' as Route} scroll={false} />} nativeButton={false}>
                <ArrowLeftRight className="size-5" aria-hidden />
                {translate('transfer')}
              </Button>
            ) : null}
            {canWrite ? (
              <Button variant="secondary" onClick={() => setForm({ account: null })}>
                <Plus className="size-5" aria-hidden />
                {translate('new')}
              </Button>
            ) : null}
          </div>
          <section className="flex flex-col rounded-card bg-card px-5 pt-1 pb-5 shadow-card lg:px-6 lg:pt-2 lg:pb-6">
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
            {tab === 'active' ? (
              <div className="flex items-center gap-4 pt-5">
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="text-body font-semibold text-text-primary">{translate('total')}</span>
                  <span className="text-label text-text-secondary">
                    {total.unknownCurrencies.length > 0
                      ? translate('totalUnknown', { currencies })
                      : translate('totalNote')}{' '}
                    <Link
                      href={'/settings/currencies' as Route}
                      className="cursor-pointer rounded-xs font-medium text-primary-text outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      {translate('rates')}
                    </Link>
                  </span>
                </div>
                <Amount minor={total.totalMinor} currency={data.baseCurrency} size="l" />
              </div>
            ) : null}
          </section>
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
