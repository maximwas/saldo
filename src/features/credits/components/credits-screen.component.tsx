'use client'

import { CreditCard as CreditCardIcon, Plus } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { useState } from 'react'
import { PaymentsTabs } from '@/components/layout/payments-tabs.component'
import { Amount } from '@/components/ui/amount.component'
import { Banner } from '@/components/ui/banner.component'
import { Button } from '@/components/ui/button.component'
import { Card } from '@/components/ui/card.component'
import { Bone, SkeletonCard } from '@/components/ui/skeleton.component'
import { useToday } from '@/contexts/clock.context'
import { useCanWrite } from '@/contexts/ledger.context'
import type { Credit } from '../api/credits.api'
import { useCredits } from '../hooks/credits.hook'
import { type CreditTotals, creditTotals, dayText, moneyText, monthNotes, nextMonthOf } from '../utils/credits.utils'
import { CreditFormSheet } from './credit-form-sheet.component'
import { CreditRow } from './credit-row.component'

type TotalsStripProps = {
  credits: readonly Credit[]
  totals: CreditTotals
}

function useNoteText(credits: readonly Credit[], totals: CreditTotals) {
  const translate = useTranslations('credits.totals')
  const locale = useLocale()
  const today = useToday()
  const notes = monthNotes(credits, today)
  const nextMonth = Number(nextMonthOf(today.slice(0, 7)).slice(5))
  const nextAmount = totals.byCurrency
    .filter((total) => total.nextMonthMinor !== 0)
    .map((total) => moneyText(total.nextMonthMinor, total.currency, locale))
    .join(' + ')
  const head = [
    notes.dueToday.length > 0 ? translate('noteToday', { names: notes.dueToday.join(', ') }) : null,
    ...notes.unconfirmed.map((note) =>
      translate('noteUnconfirmed', {
 name: note.name,
date: dayText(note.dueOn, locale) 
}),
    ),
  ].filter(Boolean)

  return {
    mobile: head.join(' · '),
    desktop: [...head, nextAmount ? translate('noteNextMonth', {
 month: nextMonth,
amount: nextAmount 
}) : null]
      .filter(Boolean)
      .join(' · '),
  }
}

// Figma «Saldo» → Credits, Summary 2:31148: two StatCards (padding 24, gap 12, label-medium, Amount L plan, caption
// tertiary), side by side on desktop, stacked on mobile (the caption there stops before «next month»)
function TotalsStrip({ credits, totals }: TotalsStripProps) {
  const translate = useTranslations('credits')
  const locale = useLocale()
  const today = useToday()
  const note = useNoteText(credits, totals)

  return (
    <div className="grid gap-4 lg:grid-cols-2 lg:gap-6">
      <section className="flex flex-col gap-3 rounded-card bg-card p-6 shadow-card">
        <h2 className="text-label font-medium text-text-secondary">
          {translate('totals.month', { month: Number(today.slice(5, 7)) })}
        </h2>
        {totals.byCurrency.map((total) => (
          <Amount key={total.currency} minor={total.monthMinor} currency={total.currency} kind="plan" size="l" />
        ))}
        {note.desktop && <p className="text-caption text-text-tertiary max-lg:hidden">{note.desktop}</p>}
        {note.mobile && <p className="text-caption text-text-tertiary lg:hidden">{note.mobile}</p>}
      </section>
      <section className="flex flex-col gap-3 rounded-card bg-card p-6 shadow-card">
        <h2 className="text-label font-medium text-text-secondary">{translate('totals.remaining')}</h2>
        {totals.byCurrency.map((total) => (
          <Amount key={total.currency} minor={total.remainingMinor} currency={total.currency} kind="plan" size="l" />
        ))}
        <p className="text-caption text-text-tertiary">
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

// Figma «Saldo» → Loading 2:48071: Tabs, two StatCard placeholders, a List card with three rows
function CreditsSkeleton() {
  return (
    <div aria-busy className="flex flex-col gap-4 lg:gap-6">
      <div className="grid gap-4 lg:grid-cols-2 lg:gap-6">
        {[0, 1].map((key) => (
          <SkeletonCard key={key} className="gap-3 p-6">
            <Bone className="h-4 w-30 rounded-sm" />
            <Bone className="h-8 w-45 rounded-sm" />
            <Bone className="h-3 w-65 max-w-full rounded-sm" />
          </SkeletonCard>
        ))}
      </div>
      <SkeletonCard className="gap-5 p-6">
        <Bone className="h-5 w-35 rounded-sm" />
        {[0, 1, 2].map((key) => (
          <div key={key} className="flex items-center gap-5">
            <Bone className="size-10 rounded-md" />
            <Bone className="h-4 w-50 rounded-sm max-lg:flex-1" />
            <Bone className="h-3 flex-1 rounded-sm max-lg:hidden" />
            <Bone className="h-4 w-30 rounded-sm max-lg:hidden" />
          </div>
        ))}
      </SkeletonCard>
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
    return (
      <div className="flex flex-col gap-4 lg:gap-6">
        <PaymentsTabs />
        <CreditsSkeleton />
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

  const estimated = data.credits.some((credit) => credit.status === 'active' && credit.scheduleAccuracy === 'estimated')

  return (
    <div className="flex flex-col gap-4 lg:gap-6">
      <PaymentsTabs />
      {!canWrite && data.credits.length > 0 && <Banner>{translate('viewOnly')}</Banner>}
      {data.credits.length === 0 ? (
        <section className="flex flex-col items-center rounded-card bg-card px-5 py-18 shadow-card">
          <div className="flex w-full max-w-100 flex-col items-center gap-3 p-2 text-center">
            <span
              aria-hidden
              className="flex size-10 items-center justify-center rounded-full bg-primary-soft text-primary-text"
            >
              <CreditCardIcon className="size-5" />
            </span>
            <h2 className="w-full text-body font-semibold text-text-primary">{translate('empty')}</h2>
            <p className="w-full text-label text-text-secondary">{translate('emptyHint')}</p>
            {canWrite && <Button onClick={() => setCreating(true)}>{translate('add')}</Button>}
          </div>
        </section>
      ) : (
        <>
          {canWrite && (
            <div className="flex justify-end">
              <Button onClick={() => setCreating(true)}>
                <Plus aria-hidden size={20} />
                {translate('add')}
              </Button>
            </div>
          )}
          <TotalsStrip credits={data.credits} totals={creditTotals(data.credits, today)} />
          {estimated && <Banner>{translate('estimatedNote')}</Banner>}
          <Card title={translate('count', { count: data.credits.length })}>
            <ul className="flex flex-col gap-4">
              {data.credits.map((credit) => (
                <CreditRow key={credit.id} credit={credit} />
              ))}
            </ul>
          </Card>
        </>
      )}
      {creating && <CreditFormSheet credit={null} onCloseAction={() => setCreating(false)} />}
    </div>
  )
}
