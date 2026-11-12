'use client'

import { Plus, Repeat, Settings2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useState } from 'react'
import { PaymentsTabs } from '@/components/layout/payments-tabs.component'
import { Button } from '@/components/ui/button.component'
import { Chip } from '@/components/ui/chip.component'
import { EmptyState } from '@/components/ui/empty-state.component'
import { ErrorState } from '@/components/ui/error-state.component'
import { Bone } from '@/components/ui/skeleton.component'
import { useCanWrite, useLedgerStore } from '@/contexts/ledger.context'
import { useScreenQueryState } from '@/lib/query/screen-query-state.hook'
import { useHydrated } from '@/lib/utils/hydrated.hook'
import { useSubscriptionParams } from '../hooks/subscription-params.hook'
import { useSubscriptions } from '../hooks/subscriptions.hook'
import { filterCounts, matchesFilter, SUBSCRIPTION_FILTERS } from '../utils/subscription-series.utils'
import { DefaultsSheet } from './defaults-sheet.component'
import { SubscriptionFormSheet } from './subscription-form-sheet.component'
import { SubscriptionRow } from './subscription-row.component'
import { SubscriptionTotals } from './subscription-totals.component'

function FilterChips() {
  const translate = useTranslations('subscriptions.filters')
  const { data } = useSubscriptions()
  const { state, setParams } = useSubscriptionParams()
  const counts = filterCounts(data ?? [])

  return (
    <fieldset aria-label={translate('label')} className="flex flex-wrap gap-2">
      {SUBSCRIPTION_FILTERS.map((filter) => {
        const selected = filter === state

        return (
          <Chip key={filter} selected={selected} onClick={() => setParams({ state: filter })}>
            {translate(filter, { count: counts[filter] })}
          </Chip>
        )
      })}
    </fieldset>
  )
}

// Figma «Saldo» → Subscriptions 2:17361 (desktop) / 2:17618 (mobile): the two totals, state chips, one card with the rows.
// Loading 5:103199, empty 5:102252, viewer 5:103450 (no add, no assessment buttons).
export function SubscriptionList() {
  const translate = useTranslations('subscriptions')
  const canWrite = useCanWrite()
  const isOwner = useLedgerStore((ledger) => ledger.role === 'owner')
  const query = useSubscriptions()
  const { data } = query
  const { failedLoad, retry } = useScreenQueryState([query], translate('refreshFailed'))
  const hydrated = useHydrated()
  const { state } = useSubscriptionParams()
  const [creating, setCreating] = useState(false)
  const [editingDefaults, setEditingDefaults] = useState(false)

  if (failedLoad) {
    return (
      <>
        <PaymentsTabs />
        <ErrorState title={translate('loadFailed')} onRetryAction={retry} />
      </>
    )
  }

  if (!hydrated || data === undefined) {
    return (
      <>
        <PaymentsTabs />
        <div aria-busy className="flex flex-col gap-4 lg:gap-6">
          <Bone className="h-32 rounded-card" />
          <Bone className="h-72 rounded-card" />
        </div>
      </>
    )
  }

  const shown = data.filter((subscription) => matchesFilter(subscription, state))

  return (
    <>
      <PaymentsTabs />
      {data.length === 0 ? (
        // Figma «Saldo» → Subscriptions · Empty 5:102252
        <EmptyState
          icon={Repeat}
          tone="pink"
          title={translate('empty.title')}
          hint={translate('empty.hint')}
          action={
            canWrite ? (
              <Button variant="secondary" onClick={() => setCreating(true)}>
                {translate('empty.action')}
              </Button>
            ) : null
          }
        />
      ) : (
        <>
          <SubscriptionTotals />
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <FilterChips />
            <div className="flex shrink-0 flex-wrap gap-2">
              {isOwner ? (
                <Button variant="ghost" onClick={() => setEditingDefaults(true)}>
                  <Settings2 aria-hidden className="size-5" />
                  {translate('defaults.open')}
                </Button>
              ) : null}
              {canWrite ? (
                <Button onClick={() => setCreating(true)}>
                  <Plus aria-hidden className="size-5" />
                  {translate('add')}
                </Button>
              ) : null}
            </div>
          </div>
          <section className="flex flex-col rounded-card bg-card px-5 pt-5 pb-1 shadow-card lg:px-6 lg:pt-6">
            <h2 className="text-card-title text-text-primary">{translate('count', { count: shown.length })}</h2>
            {shown.length === 0 ? (
              <p className="py-8 text-center text-label text-text-secondary">{translate('filteredEmpty')}</p>
            ) : (
              <ul className="flex flex-col">
                {shown.map((subscription) => (
                  <SubscriptionRow key={subscription.id} subscription={subscription} />
                ))}
              </ul>
            )}
          </section>
        </>
      )}
      {creating ? <SubscriptionFormSheet onCloseAction={() => setCreating(false)} /> : null}
      {editingDefaults ? <DefaultsSheet onCloseAction={() => setEditingDefaults(false)} /> : null}
    </>
  )
}
