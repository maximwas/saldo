import { useTranslations } from 'next-intl'
import { useMoneyText } from '@/components/ui/amount.component'
import { Badge } from '@/components/ui/badge.component'
import { useLedgerStore } from '@/contexts/ledger.context'
import { cn } from '@/lib/utils/cn.utils'
import type { BudgetFact, LimitProgress } from '../utils/budget.utils'

function carryKind(carried: number | null) {
  if (carried === null) {
    return 'unknown'
  }

  return carried > 0 ? 'carried' : 'plain'
}

type LimitNotesProps = {
  fact: BudgetFact
  progress: LimitProgress
}

// the line under the bar: the remainder (or the overspend) on the left, «of limit · N %» on the right
export function LimitNotes({ fact, progress }: LimitNotesProps) {
  const translate = useTranslations('budget.limits')
  const moneyText = useMoneyText()
  const currency = useLedgerStore((ledger) => ledger.baseCurrency)
  const money = (minor: number) => moneyText(minor, currency)
  const { state } = progress

  if (state === 'none' || fact.limitMinor === null) {
    return (
      <p className="flex flex-wrap items-center gap-2 text-label text-text-secondary">
        {translate('noLimit')}
        {fact.unknownCount > 0 ? (
          <Badge tone="unknown">{translate('unknown', { count: fact.unknownCount })}</Badge>
        ) : null}
      </p>
    )
  }

  const left = fact.remainingMinor === null ? translate('remainingUnknown') : null
  const remaining = money(fact.remainingMinor ?? 0)
  const pct = progress.percent
  const limit = money(fact.limitMinor)
  const right = {
    unknown: translate('carriedUnknown', {
      limit,
      pct,
    }),
    carried: translate('ofLimitCarried', {
      limit,
      carried: money(fact.carriedInMinor ?? 0),
      pct,
    }),
    plain: translate('ofLimit', {
      limit,
      pct,
    }),
  }[carryKind(fact.carriedInMinor)]
  const text = {
    over: translate('over', { amount: money(progress.overMinor) }),
    warning: translate('warning', {
      pct: fact.warnAtPct,
      amount: remaining,
    }),
    ok: translate('remaining', { amount: remaining }),
  }[state]

  return (
    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-label">
      <span className={cn(state === 'ok' ? 'text-text-secondary' : 'font-medium text-warning-text')}>
        {left ?? text}
      </span>
      <span className="flex items-center gap-2 text-text-secondary">
        {fact.unknownCount > 0 ? (
          <Badge tone="unknown">{translate('unknown', { count: fact.unknownCount })}</Badge>
        ) : null}
        {right}
      </span>
    </div>
  )
}
