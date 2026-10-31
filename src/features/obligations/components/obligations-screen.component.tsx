'use client'

import { CircleCheck, Plus } from 'lucide-react'
import type { Route } from 'next'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { parseAsString, useQueryState } from 'nuqs'
import { useState } from 'react'
import { PaymentsTabs } from '@/components/layout/payments-tabs.component'
import { Banner } from '@/components/ui/banner.component'
import { Button } from '@/components/ui/button.component'
import { Bone, SkeletonCard } from '@/components/ui/skeleton.component'
import { useToday } from '@/contexts/clock.context'
import { useCanWrite } from '@/contexts/ledger.context'
import { useSyncQueue } from '@/lib/query/sync-queue.hook'
import type { ObligationRow } from '../api/obligations.api'
import { useObligationOptions, useObligations } from '../hooks/obligations.hook'
import { useQueuedPayments } from '../hooks/queued-payments.hook'
import { BUCKETS, groupByBucket } from '../utils/obligation-groups.utils'
import { CancelPaymentSheet } from './cancel-payment-sheet.component'
import { ObligationFormSheet } from './obligation-form-sheet.component'
import { ObligationRowItem } from './obligation-row.component'
import { ObligationSheetsHost } from './obligation-sheets-host.component'
import { ObligationSummary } from './obligation-summary.component'

type FormState = { obligation: ObligationRow | null } | null

const CARD = 'flex flex-col gap-5 rounded-card bg-card p-6 shadow-card'

// Figma «Saldo» → Upcoming payments 2:12142 / 2:13276 (Tabs, Summary, a white Card per group, amber note under «date
// passed»), Empty 5:86122, Loading 5:86923, Offline 5:88395, View only 5:94297. The Paid sheet is the ?pay=<obligation id>
// state of the page (plan 1.11); a debt's date is paid by a repayment on the debt (add_debt_movement), so its row leads
// to the debts screen instead.
export function ObligationsScreen() {
  const translate = useTranslations('obligations')
  const canWrite = useCanWrite()
  const today = useToday()
  const { data, isPending, isError } = useObligations()
  const options = useObligationOptions()
  const router = useRouter()
  const queuedPayments = useQueuedPayments()
  const { online } = useSyncQueue()
  const [, setPayId] = useQueryState('pay', parseAsString)
  const [form, setForm] = useState<FormState>(null)
  const [cancelId, setCancelId] = useState<string | null>(null)

  if (isPending || options.isPending) {
    return (
      <div className="flex flex-col gap-4 lg:gap-6">
        <PaymentsTabs />
        <div aria-busy className="flex flex-col gap-4 lg:gap-6">
          <div className="grid grid-cols-3 gap-6 max-lg:hidden">
            {[0, 1, 2].map((key) => (
              <SkeletonCard key={key} className="gap-3 p-6">
                <Bone className="h-4 w-35 rounded-sm" />
                <Bone className="h-8 w-45 rounded-sm" />
                <Bone className="h-3 w-30 rounded-sm" />
              </SkeletonCard>
            ))}
          </div>
          <SkeletonCard className="gap-5 p-6">
            <Bone className="h-5 w-55 rounded-sm" />
            {[0, 1, 2].map((key) => (
              <div key={key} className="flex items-center gap-4">
                <Bone className="size-10 rounded-md" />
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <Bone className="h-4 w-48 max-w-full rounded-sm" />
                  <Bone className="h-3 w-64 max-w-full rounded-sm" />
                </div>
                <Bone className="h-4 w-24 rounded-sm" />
              </div>
            ))}
          </SkeletonCard>
        </div>
      </div>
    )
  }

  if (isError || options.isError) {
    return (
      <p role="alert" className="text-body text-negative-text">
        {translate('loadFailed')}
      </p>
    )
  }

  const groups = groupByBucket(data.open, today)
  const everything = [...data.open, ...data.paid]
  const cancelling = everything.find((row) => row.id === cancelId)
  const waiting = data.open.filter((row) => queuedPayments.has(row.id))
  const addPayment = () => setForm({ obligation: null })

  const renderRow = (row: ObligationRow) => (
    <ObligationRowItem
      key={row.id}
      obligation={row}
      awaitingSync={queuedPayments.has(row.id)}
      onPay={() => (row.sourceType === 'debt' ? router.push('/payments/debts' as Route) : void setPayId(row.id))}
      onEdit={() => setForm({ obligation: row })}
      onCancelPayment={() => setCancelId(row.id)}
    />
  )

  return (
    <div className="flex flex-col gap-4 lg:gap-6">
      <PaymentsTabs />
      {!online && waiting.length > 0 && (
        <Banner role="alert">
          {waiting.length === 1
            ? translate('offlineQueued', { title: waiting[0]?.title ?? '' })
            : translate('offlineQueuedMany', { count: waiting.length })}
        </Banner>
      )}
      {canWrite && data.open.length > 0 && (
        <div className="flex justify-end">
          <Button onClick={addPayment}>
            <Plus aria-hidden size={20} />
            {translate('add')}
          </Button>
        </div>
      )}
      <ObligationSummary open={data.open} />
      {data.open.length === 0 && (
        <section className="flex flex-col items-center rounded-card bg-card px-5 py-10 shadow-card">
          <div className="flex w-full max-w-88 flex-col items-center gap-3 p-2 text-center">
            <span
              aria-hidden
              className="flex size-10 items-center justify-center rounded-full bg-cat-green-soft text-cat-green-text"
            >
              <CircleCheck className="size-5" />
            </span>
            <h2 className="w-full text-body font-semibold text-text-primary">{translate('empty.title')}</h2>
            <p className="w-full text-label text-text-secondary">
              <span className="lg:hidden">{translate('empty.textShort')}</span>
              <span className="max-lg:hidden">{translate('empty.text')}</span>
            </p>
            {canWrite && (
              <Button variant="secondary" onClick={addPayment}>
                <span className="lg:hidden">{translate('empty.addShort')}</span>
                <span className="max-lg:hidden">{translate('empty.add')}</span>
              </Button>
            )}
          </div>
        </section>
      )}
      {BUCKETS.filter((bucket) => groups[bucket].length > 0).map((bucket) => (
        <section key={bucket} className={CARD}>
          <h2 className="text-card-title text-text-primary">{translate(`groups.${bucket}`)}</h2>
          <div className="flex flex-col">
            {bucket === 'overdue' && (
              <p className="text-label text-text-secondary">
                {translate(canWrite ? 'overdueHint' : 'overdueHintViewer')}
              </p>
            )}
            <ul className="flex flex-col">{groups[bucket].map(renderRow)}</ul>
          </div>
        </section>
      ))}
      {data.paid.length > 0 && (
        <section className={CARD}>
          <h2 className="text-card-title text-text-primary">{translate('groups.paid')}</h2>
          <ul className="flex flex-col">{data.paid.map(renderRow)}</ul>
        </section>
      )}
      <ObligationSheetsHost />
      {form && <ObligationFormSheet obligation={form.obligation} onClose={() => setForm(null)} />}
      {cancelling && <CancelPaymentSheet obligation={cancelling} onClose={() => setCancelId(null)} />}
    </div>
  )
}
