'use client'

import { Info, Plus } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useState } from 'react'
import { Amount } from '@/components/ui/amount.component'
import { Button } from '@/components/ui/button.component'
import { useCanWrite } from '@/contexts/ledger.context'
import type { DebtRow } from '../api/debts.api'
import { useDebts } from '../hooks/debts.hook'
import { type CurrencyTotal, openCount, owedTotals } from '../utils/debt-groups.utils'
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

// Figma «Saldo» → Personal debts, Desktop 2:61492 / Mobile 2:61784 (two totals, a note, two cards: owed to me and
// I owe), empty Mobile 2:66269, loading Mobile 2:66731 (skeleton), view-only Desktop 2:65522 (no action buttons).
export function DebtsScreen() {
  const translate = useTranslations('debts')
  const canWrite = useCanWrite()
  const { data, isPending, isError } = useDebts()
  const [sheet, setSheet] = useState<Sheet>(null)

  if (isPending) {
    return <DebtsSkeleton />
  }

  if (isError) {
    return (
      <p role="alert" className="text-body text-negative-text">
        {translate('loadFailed')}
      </p>
    )
  }

  const close = () => setSheet(null)

  return (
    <div className="flex flex-col gap-4 lg:gap-6">
      {canWrite && (
        <div className="flex justify-end">
          <Button
            onClick={() =>
              setSheet({
                kind: 'form',
                debt: null,
              })
            }
          >
            <Plus aria-hidden size={20} />
            {translate('add')}
          </Button>
        </div>
      )}
      {data.length === 0 ? (
        <div className="flex flex-col gap-1 rounded-card bg-card p-6 text-center shadow-card">
          <p className="text-body font-medium text-text-primary">{translate('empty')}</p>
          <p className="text-caption text-text-secondary">{translate('emptyHint')}</p>
        </div>
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-2 lg:gap-6">
            {GROUPS.map((group) => (
              <DebtTotal
                key={group.key}
                debts={data}
                direction={group.direction}
                label={translate(`summary.${group.key}`)}
              />
            ))}
          </div>
          <p className="flex gap-3 rounded-inner bg-primary-soft p-4 text-body-medium text-primary-text">
            <Info className="mt-0.5 size-5 shrink-0" aria-hidden />
            {translate('note')}
          </p>
          <div className="grid items-start gap-4 lg:grid-cols-2 lg:gap-6">
            {GROUPS.map((group) => (
              <section key={group.key} className="flex flex-col gap-4 rounded-card bg-card p-5 shadow-card lg:p-6">
                <h2 className="text-card-title text-text-primary">{translate(`groups.${group.key}`)}</h2>
                <DebtList
                  debts={data.filter((debt) => debt.direction === group.direction)}
                  onAction={(debt, action) => setSheet(sheetFor(debt, action))}
                />
              </section>
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
  onAction: (debt: DebtRow, action: DebtAction) => void
}

function DebtList({ debts, onAction }: DebtListProps) {
  const translate = useTranslations('debts')

  if (debts.length === 0) {
    return <p className="text-caption text-text-secondary">{translate('groupEmpty')}</p>
  }

  return (
    <ul className="flex flex-col gap-5">
      {debts.map((debt) => (
        <DebtRowItem key={debt.id} debt={debt} onAction={(action) => onAction(debt, action)} />
      ))}
    </ul>
  )
}

type DebtTotalProps = {
  debts: DebtRow[]
  direction: DebtDirection
  label: string
}

function DebtTotal({ debts, direction, label }: DebtTotalProps) {
  const translate = useTranslations('debts')
  const totals = owedTotals(debts, direction)
  const count = openCount(debts, direction)

  return (
    <div className="flex flex-col gap-2 rounded-card bg-card p-5 shadow-card lg:p-6">
      <p className="text-label font-medium text-text-secondary">{label}</p>
      <TotalAmounts totals={totals} />
      <p className="text-caption text-text-secondary">
        {count === 0 ? translate('summary.none') : translate('summary.count', { count })}
      </p>
    </div>
  )
}

// one figure per currency: amounts of different currencies are never added up without rates
function TotalAmounts({ totals }: { totals: CurrencyTotal[] }) {
  if (totals.length === 0) {
    return <Amount minor={0} currency="UAH" size="l" kind="plan" />
  }

  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1">
      {totals.map((total) => (
        <Amount key={total.currency} minor={total.minor} currency={total.currency} size="l" />
      ))}
    </div>
  )
}

function DebtsSkeleton() {
  return (
    <div aria-busy className="flex flex-col gap-4 lg:gap-6">
      <div className="grid gap-4 lg:grid-cols-2 lg:gap-6">
        <div className="h-32 animate-pulse rounded-card bg-subtle" />
        <div className="h-32 animate-pulse rounded-card bg-subtle" />
      </div>
      <div className="h-64 animate-pulse rounded-card bg-subtle" />
    </div>
  )
}
