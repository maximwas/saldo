'use client'

import { Info, Plus } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { useState } from 'react'
import { Amount } from '@/components/ui/amount.component'
import { Button } from '@/components/ui/button.component'
import { useToday } from '@/contexts/clock.context'
import { useCanWrite } from '@/contexts/ledger.context'
import { useCredits } from '../hooks/credits.hook'
import { type CreditTotals, creditTotals, dayText } from '../utils/credits.utils'
import { CreditFormSheet } from './credit-form-sheet.component'
import { CreditRow } from './credit-row.component'

type TotalsStripProps = {
  totals: CreditTotals
}

// Figma «Saldo» → SummaryStrip 2:10084 in Credits: this month's installments and the whole rest, one line per currency
function TotalsStrip({ totals }: TotalsStripProps) {
  const translate = useTranslations('credits')
  const locale = useLocale()

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:gap-6">
      <section className="flex flex-col gap-2 rounded-card bg-card p-5 shadow-card lg:p-6">
        <h2 className="text-label text-text-secondary">{translate('totals.month')}</h2>
        {totals.byCurrency.map((total) => (
          <Amount key={total.currency} minor={total.monthMinor} currency={total.currency} size="l" />
        ))}
      </section>
      <section className="flex flex-col gap-2 rounded-card bg-card p-5 shadow-card lg:p-6">
        <h2 className="text-label text-text-secondary">{translate('totals.remaining')}</h2>
        {totals.byCurrency.map((total) => (
          <Amount key={total.currency} minor={total.remainingMinor} currency={total.currency} size="l" />
        ))}
        <p className="text-caption text-text-secondary">
          {translate('totals.summary', {
            credits: totals.activeCount,
            installments: totals.openCount,
          })}
          {totals.endOn && ` · ${translate('totals.until', { date: dayText(totals.endOn, locale, true) })}`}
        </p>
      </section>
    </div>
  )
}

function CreditsSkeleton() {
  return (
    <div aria-busy className="flex flex-col gap-4 lg:gap-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:gap-6">
        <div className="h-32 rounded-card bg-subtle" />
        <div className="h-32 rounded-card bg-subtle" />
      </div>
      <div className="h-96 rounded-card bg-subtle" />
    </div>
  )
}

// Figma «Saldo» → Credits 2:31057 / 2:39905, empty 2:47672, loading 2:48071, viewer 2:48478 (no write buttons)
export function CreditsScreen() {
  const translate = useTranslations('credits')
  const canWrite = useCanWrite()
  const today = useToday()
  const { data, isPending, isError } = useCredits()
  const [creating, setCreating] = useState(false)

  if (isPending) {
    return <CreditsSkeleton />
  }

  if (isError) {
    return (
      <p role="alert" className="text-body text-negative-text">
        {translate('loadFailed')}
      </p>
    )
  }

  const estimated = data.credits.some((credit) => credit.status === 'active' && credit.scheduleAccuracy === 'estimated')
  const addButton = canWrite && (
    <Button onClick={() => setCreating(true)}>
      <Plus aria-hidden size={20} />
      {translate('add')}
    </Button>
  )

  return (
    <div className="flex flex-col gap-4 lg:gap-6">
      {data.credits.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-card bg-card p-6 text-center shadow-card">
          <p className="text-body font-medium text-text-primary">{translate('empty')}</p>
          <p className="max-w-md text-caption text-text-secondary">{translate('emptyHint')}</p>
          {addButton}
        </div>
      ) : (
        <>
          {canWrite && <div className="flex justify-end">{addButton}</div>}
          <TotalsStrip totals={creditTotals(data.credits, today)} />
          {estimated && (
            <p className="flex gap-3 rounded-inner bg-primary-soft p-4 text-label font-medium text-primary-text">
              <Info className="mt-0.5 size-5 shrink-0" aria-hidden />
              {translate('estimatedNote')}
            </p>
          )}
          <section className="flex flex-col gap-4 rounded-card bg-card p-5 shadow-card lg:p-6">
            <h2 className="text-card-title text-text-primary">{translate('count', { count: data.credits.length })}</h2>
            <ul className="flex flex-col">
              {data.credits.map((credit) => (
                <CreditRow key={credit.id} credit={credit} />
              ))}
            </ul>
          </section>
        </>
      )}
      {creating && <CreditFormSheet credit={null} onCloseAction={() => setCreating(false)} />}
    </div>
  )
}
