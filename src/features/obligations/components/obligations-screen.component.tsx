'use client'

import { Plus } from 'lucide-react'
import type { Route } from 'next'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { parseAsString, useQueryState } from 'nuqs'
import { useState } from 'react'
import { Button } from '@/components/ui/button.component'
import { useToday } from '@/contexts/clock.context'
import { useCanWrite } from '@/contexts/ledger.context'
import type { ObligationRow } from '../api/obligations.api'
import { useObligationOptions, useObligations } from '../hooks/obligations.hook'
import { BUCKETS, groupByBucket } from '../utils/obligation-groups.utils'
import { CancelPaymentSheet } from './cancel-payment-sheet.component'
import { ObligationFormSheet } from './obligation-form-sheet.component'
import { ObligationRowItem } from './obligation-row.component'
import { ObligationSheetsHost } from './obligation-sheets-host.component'

type FormState = { obligation: ObligationRow | null } | null

// Figma «Saldo» → Upcoming payments 2:12142 (desktop) / 2:13276 (mobile): white cards per group, amber hint under
// date passed, not confirmed. The Paid sheet is the ?pay=<obligation id> state of the page (plan 1.11); a debt's date
// is paid by a repayment on the debt (add_debt_movement), so its row leads to the debts screen instead.
export function ObligationsScreen() {
  const translate = useTranslations('obligations')
  const canWrite = useCanWrite()
  const today = useToday()
  const { data, isPending, isError } = useObligations()
  const options = useObligationOptions()
  const router = useRouter()
  const [, setPayId] = useQueryState('pay', parseAsString)
  const [form, setForm] = useState<FormState>(null)
  const [cancelId, setCancelId] = useState<string | null>(null)

  if (isPending || options.isPending) {
    return <div aria-busy className="h-64 rounded-card bg-subtle" />
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

  const renderRow = (row: ObligationRow) => (
    <ObligationRowItem
      key={row.id}
      obligation={row}
      onPay={() => (row.sourceType === 'debt' ? router.push('/payments/debts' as Route) : void setPayId(row.id))}
      onEdit={() => setForm({ obligation: row })}
      onCancelPayment={() => setCancelId(row.id)}
    />
  )

  return (
    <div className="flex flex-col gap-4 lg:gap-6">
      {canWrite && (
        <div className="flex justify-end">
          <Button onClick={() => setForm({ obligation: null })}>
            <Plus aria-hidden size={20} />
            {translate('add')}
          </Button>
        </div>
      )}
      {data.open.length === 0 && (
        <div className="flex flex-col gap-1 rounded-card bg-card p-6 text-center shadow-card">
          <p className="text-body font-medium text-text-primary">{translate('empty')}</p>
          <p className="text-caption text-text-secondary">{translate('emptyHint')}</p>
        </div>
      )}
      {BUCKETS.filter((bucket) => groups[bucket].length > 0).map((bucket) => (
        <section key={bucket} className="flex flex-col gap-4 rounded-card bg-card p-5 shadow-card lg:p-6">
          <h2 className="text-card-title text-text-primary">{translate(`groups.${bucket}`)}</h2>
          {bucket === 'overdue' && <p className="text-caption text-text-secondary">{translate('overdueHint')}</p>}
          <ul className="flex flex-col gap-4">{groups[bucket].map(renderRow)}</ul>
        </section>
      ))}
      {data.paid.length > 0 && (
        <section className="flex flex-col gap-4 rounded-card bg-card p-5 shadow-card lg:p-6">
          <h2 className="text-card-title text-text-primary">{translate('groups.paid')}</h2>
          <ul className="flex flex-col gap-4">{data.paid.map(renderRow)}</ul>
        </section>
      )}
      <ObligationSheetsHost />
      {form && <ObligationFormSheet obligation={form.obligation} onClose={() => setForm(null)} />}
      {cancelling && <CancelPaymentSheet obligation={cancelling} onClose={() => setCancelId(null)} />}
    </div>
  )
}
