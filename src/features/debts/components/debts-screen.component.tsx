'use client'

import { useQueryClient } from '@tanstack/react-query'
import { HandCoins, Plus } from 'lucide-react'
import { useFormatter, useLocale, useTranslations } from 'next-intl'
import { useState } from 'react'
import { PaymentsTabs } from '@/components/layout/payments-tabs.component'
import { Amount } from '@/components/ui/amount.component'
import { Banner } from '@/components/ui/banner.component'
import { Button } from '@/components/ui/button.component'
import { Card } from '@/components/ui/card.component'
import { Bone, SkeletonCard } from '@/components/ui/skeleton.component'
import { useCanWrite } from '@/contexts/ledger.context'
import { formatMinor } from '@/lib/money/money.utils'
import { resumeWrites } from '@/lib/query/ledger-writes.mutations'
import { useSyncQueue } from '@/lib/query/sync-queue.hook'
import type { DebtRow } from '../api/debts.api'
import { useDebts, useQueuedRepayments } from '../hooks/debts.hook'
import { type CurrencyTotal, nearestDue, openCount, owedTotals, partlyRepaid } from '../utils/debt-groups.utils'
import type { DebtDirection } from '../utils/debts.utils'
import { DebtFormSheet } from './debt-form-sheet.component'
import { type DebtAction, DebtRowItem } from './debt-row.component'
import { DebtStatusSheet } from './debt-status-sheet.component'
import { RepaymentSheet } from './repayment-sheet.component'

type Sheet =
  | {
      kind: 'form'
      debt: DebtRow | null
    }
  | {
      kind: 'repay'
      debt: DebtRow
      closing: boolean
    }
  | {
      kind: 'status'
      debt: DebtRow
      status: 'settled' | 'written_off'
    }
  | null

const GROUPS = [
  {
    direction: 'owed_to_me',
    key: 'owedToMe',
  },
  {
    direction: 'i_owe',
    key: 'iOwe',
  },
] as const

// closing a debt with something left is a repayment of the rest; with nothing left it only sets the status
function sheetFor(debt: DebtRow, action: DebtAction): Sheet {
  switch (action) {
    case 'repay':
      return {
        kind: 'repay',
        debt,
        closing: false,
      }
    case 'close':
      return debt.remainingMinor > 0
        ? {
            kind: 'repay',
            debt,
            closing: true,
          }
        : {
            kind: 'status',
            debt,
            status: 'settled',
          }
    case 'writeOff':
      return {
        kind: 'status',
        debt,
        status: 'written_off',
      }
    case 'edit':
      return {
        kind: 'form',
        debt,
      }
  }
}

// Figma «Saldo» → Personal debts, Desktop 2:61492 / Mobile 2:61784 (Tabs, two totals, a note, two cards: owed to me and
// I owe), empty Mobile 2:66269, loading Mobile 2:66731, offline Desktop 2:65228 (amber banner with the queued
// repayment), view-only Desktop 2:65522 (no action buttons).
export function DebtsScreen() {
  const translate = useTranslations('debts')
  const locale = useLocale()
  const canWrite = useCanWrite()
  const queryClient = useQueryClient()
  const { online } = useSyncQueue()
  const queued = useQueuedRepayments()
  const { data, isPending, isError } = useDebts()
  const [sheet, setSheet] = useState<Sheet>(null)

  if (isPending) {
    return (
      <div className="flex flex-col gap-4 lg:gap-6">
        <PaymentsTabs />
        <DebtsSkeleton />
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

  const close = () => setSheet(null)
  const waiting = queued.length > 0 && !online ? data.find((debt) => debt.id === queued[0]?.movement.debt_id) : null
  const addDebt = () =>
    setSheet({
      kind: 'form',
      debt: null,
    })

  return (
    <div className="flex flex-col gap-4 lg:gap-6">
      <PaymentsTabs />
      {!canWrite && data.length > 0 && <Banner>{translate('viewOnly')}</Banner>}
      {waiting && (
        <Banner
          kind="warning"
          role="alert"
          action={
            <button type="button" className="cursor-pointer" onClick={() => void resumeWrites(queryClient)}>
              {translate('offlineRetry')}
            </button>
          }
        >
          {translate('offline', {
            person: waiting.person,
            amount: formatMinor(queued[0]?.movement.amount_minor ?? 0, waiting.currency, locale),
          })}
        </Banner>
      )}
      {canWrite && data.length > 0 && (
        <div className="flex justify-end">
          <Button onClick={addDebt}>
            <Plus aria-hidden size={20} />
            {translate('add')}
          </Button>
        </div>
      )}
      {data.length === 0 ? (
        <section className="flex flex-col items-center rounded-card bg-card px-5 py-10 shadow-card">
          <div className="flex w-full max-w-100 flex-col items-center gap-3 p-2 text-center">
            <span
              aria-hidden
              className="flex size-10 items-center justify-center rounded-full bg-cat-green-soft text-cat-green-text"
            >
              <HandCoins className="size-5" />
            </span>
            <h2 className="w-full text-body font-semibold text-text-primary">{translate('empty')}</h2>
            <p className="w-full text-label text-text-secondary">{translate('emptyHint')}</p>
            {canWrite && <Button onClick={addDebt}>{translate('add')}</Button>}
          </div>
        </section>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:gap-6">
            {GROUPS.map((group) => (
              <DebtTotal
                key={group.key}
                debts={data}
                direction={group.direction}
                label={translate(`summary.${group.key}`)}
              />
            ))}
          </div>
          <Banner>
            <span className="max-lg:hidden">{translate('note')}</span>
            <span className="lg:hidden">{translate('noteShort')}</span>
          </Banner>
          <div className="grid gap-4 lg:grid-cols-2 lg:gap-6">
            {GROUPS.map((group) => (
              <Card key={group.key} title={translate(`groups.${group.key}`)}>
                <DebtList
                  debts={data.filter((debt) => debt.direction === group.direction)}
                  onActionAction={(debt, action) => setSheet(sheetFor(debt, action))}
                />
              </Card>
            ))}
          </div>
        </>
      )}
      {sheet?.kind === 'form' && <DebtFormSheet debt={sheet.debt} onCloseAction={close} />}
      {sheet?.kind === 'repay' && <RepaymentSheet debt={sheet.debt} closing={sheet.closing} onCloseAction={close} />}
      {sheet?.kind === 'status' && <DebtStatusSheet debt={sheet.debt} status={sheet.status} onCloseAction={close} />}
    </div>
  )
}

type DebtListProps = {
  debts: DebtRow[]
  onActionAction: (debt: DebtRow, action: DebtAction) => void
}

function DebtList({ debts, onActionAction }: DebtListProps) {
  const translate = useTranslations('debts')

  if (debts.length === 0) {
    return <p className="text-caption text-text-secondary">{translate('groupEmpty')}</p>
  }

  return (
    <ul className="flex flex-col gap-4">
      {debts.map((debt) => (
        <DebtRowItem key={debt.id} debt={debt} onActionAction={(action) => onActionAction(debt, action)} />
      ))}
    </ul>
  )
}

type DebtTotalProps = {
  debts: DebtRow[]
  direction: DebtDirection
  label: string
}

// Figma «Saldo» → StatCard: padding 24, gap 12, label-medium, Amount L, caption tertiary; the caption on desktop names
// the first partly repaid debt (owed to me) or the nearest due date (I owe), on mobile only the count
function DebtTotal({ debts, direction, label }: DebtTotalProps) {
  const translate = useTranslations('debts')
  const format = useFormatter()
  const locale = useLocale()
  const totals = owedTotals(debts, direction)
  const count = openCount(debts, direction)
  const lead = partlyRepaid(debts, direction)
  const due = nearestDue(debts, direction)
  const dueText = due
    ? translate('summary.nearestDue', {
        date: format.dateTime(new Date(`${due}T12:00:00Z`), {
          timeZone: 'UTC',
          day: '2-digit',
          month: '2-digit',
        }),
      })
    : null
  const leadText = lead
    ? translate('summary.repaidLead', {
        person: lead.person,
        repaid: formatMinor(lead.repaidMinor, lead.currency, locale),
        principal: formatMinor(lead.principalMinor, lead.currency, locale),
      })
    : null
  const extra = leadText ?? dueText

  return (
    <section className="flex flex-col gap-3 rounded-card bg-card p-6 shadow-card">
      <p className="text-label font-medium text-text-secondary">{label}</p>
      <TotalAmounts totals={totals} />
      <p className="text-caption text-text-tertiary">
        {count === 0 ? (
          translate('summary.none')
        ) : (
          <>
            <span className="max-lg:hidden">
              {[translate('summary.count', { count }), extra].filter(Boolean).join(' · ')}
            </span>
            <span className="lg:hidden">{translate('summary.countShort', { count })}</span>
          </>
        )}
      </p>
    </section>
  )
}

// one figure per currency: amounts of different currencies are never added up without rates
function TotalAmounts({ totals }: { totals: CurrencyTotal[] }) {
  if (totals.length === 0) {
    return <Amount minor={0} currency="UAH" size="l" />
  }

  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1">
      {totals.map((total) => (
        <Amount key={total.currency} minor={total.minor} currency={total.currency} size="l" />
      ))}
    </div>
  )
}

// Figma «Saldo» → Loading 2:66731: two StatCard placeholders, a card with a title and three rows (square, bar, short bar)
function DebtsSkeleton() {
  return (
    <div aria-busy className="flex flex-col gap-4 lg:gap-6">
      <div className="grid grid-cols-2 gap-4 lg:gap-6">
        {[0, 1].map((key) => (
          <SkeletonCard key={key} className="gap-3 p-6">
            <Bone className="h-3 w-30 rounded-sm" />
            <Bone className="h-6 w-35 rounded-sm" />
          </SkeletonCard>
        ))}
      </div>
      <SkeletonCard className="gap-5 p-6">
        <Bone className="h-4 w-30 rounded-sm" />
        {[0, 1, 2].map((key) => (
          <div key={key} className="flex items-center gap-4">
            <Bone className="size-10 rounded-md" />
            <Bone className="h-3 flex-1 rounded-sm" />
            <Bone className="h-3 w-20 rounded-sm" />
          </div>
        ))}
      </SkeletonCard>
    </div>
  )
}
