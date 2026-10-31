'use client'

import { Check, Plus, Repeat, Settings2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useState } from 'react'
import { Button } from '@/components/ui/button.component'
import { useCanWrite, useLedgerStore } from '@/contexts/ledger.context'
import { cn } from '@/lib/utils/cn.utils'
import { useSubscriptionParams } from '../hooks/subscription-params.hook'
import { useSubscriptions } from '../hooks/subscriptions.hook'
import { filterCounts, matchesFilter, SUBSCRIPTION_FILTERS } from '../utils/subscription-series.utils'
import { DefaultsSheet } from './defaults-sheet.component'
import { SubscriptionFormSheet } from './subscription-form-sheet.component'
import { SubscriptionRow } from './subscription-row.component'
import { SubscriptionTotals } from './subscription-totals.component'

type EmptyStateProps = {
  onAddAction: () => void
}

// Figma «Saldo» → Subscriptions · Empty 5:102252
function EmptyState({ onAddAction }: EmptyStateProps) {
  const translate = useTranslations('subscriptions.empty')
  const canWrite = useCanWrite()

  return (
    <section className="flex flex-col items-center gap-3 rounded-card bg-card px-5 py-12 text-center shadow-card">
      <span
        aria-hidden
        className="flex size-10 items-center justify-center rounded-full bg-cat-pink-soft text-cat-pink"
      >
        <Repeat className="size-5" />
      </span>
      <h2 className="text-card-title text-text-primary">{translate('title')}</h2>
      <p className="max-w-sm text-label text-text-secondary">{translate('hint')}</p>
      {canWrite ? (
        <Button variant="secondary" onClick={onAddAction}>
          {translate('action')}
        </Button>
      ) : null}
    </section>
  )
}

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
          <button
            key={filter}
            type="button"
            aria-pressed={selected}
            onClick={() => setParams({ state: filter })}
            className={cn(
              'flex h-9 cursor-pointer items-center gap-1.5 rounded-full border px-3 text-label font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary',
              selected
                ? 'border-primary-soft bg-primary-soft text-primary-text'
                : 'border-border-strong bg-card text-text-primary hover:bg-subtle',
            )}
          >
            {selected ? <Check aria-hidden className="size-4" /> : null}
            {translate(filter, { count: counts[filter] })}
          </button>
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
  const { data, isPending, isError } = useSubscriptions()
  const { state } = useSubscriptionParams()
  const [creating, setCreating] = useState(false)
  const [editingDefaults, setEditingDefaults] = useState(false)

  if (isPending) {
    return (
      <div aria-busy className="flex flex-col gap-4 lg:gap-6">
        <div className="h-32 rounded-card bg-subtle" />
        <div className="h-72 rounded-card bg-subtle" />
      </div>
    )
  }

  if (isError) {
    return (
      <p role="alert" className="text-body text-negative-text">
        {translate('loadFailed')}
      </p>
    )
  }

  const shown = data.filter((subscription) => matchesFilter(subscription, state))

  return (
    <>
      {data.length === 0 ? (
        <EmptyState onAddAction={() => setCreating(true)} />
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
