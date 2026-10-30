import { Pencil } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { Amount } from '@/components/ui/amount.component'
import { Button } from '@/components/ui/button.component'
import { useCanWrite, useLedgerStore } from '@/contexts/ledger.context'
import { formatMinor } from '@/lib/money/money.utils'
import { useBudgetSheetStore } from '@/store/budget-sheet.store'
import type { BudgetMonth } from '../api/budget.api'
import { budgetTotals } from '../utils/budget.utils'

type TileProps = {
  label: string
  children: React.ReactNode
}

function Tile({ label, children }: TileProps) {
  return (
    <div className="flex flex-col gap-1 rounded-card bg-subtle px-4 py-3">
      <dt className="text-label text-text-secondary">{label}</dt>
      <dd className="flex flex-col gap-0.5">{children}</dd>
    </div>
  )
}

function IncomePlanNote({ planMinor }: { planMinor: number | null }) {
  const translate = useTranslations('budget.summary')
  const locale = useLocale()
  const currency = useLedgerStore((ledger) => ledger.baseCurrency)
  const canWrite = useCanWrite()
  const open = useBudgetSheetStore((state) => state.open)
  const text =
    planMinor === null
      ? translate('incomePlanNone')
      : translate('incomePlan', { amount: formatMinor(planMinor, currency, locale) })

  return (
    <span className="flex items-center gap-1 text-caption text-text-secondary">
      {text}
      {canWrite ? (
        <Button
          variant="ghost"
          size="s"
          className="h-6 px-1"
          aria-label={translate('editIncomePlan')}
          onClick={() => open({ kind: 'income' })}
        >
          <Pencil className="size-3.5" aria-hidden />
        </Button>
      ) : null}
    </span>
  )
}

// income, expenses and the result of the month; only the fact: a plan is never summed into it (§12)
export function SummaryTiles({ data }: { data: BudgetMonth }) {
  const translate = useTranslations('budget.summary')
  const locale = useLocale()
  const currency = useLedgerStore((ledger) => ledger.baseCurrency)
  const totals = budgetTotals(data.facts)
  const limits =
    totals.limitsMinor > 0
      ? translate('limitsTotal', { amount: formatMinor(totals.limitsMinor, currency, locale) })
      : translate('limitsNone')

  return (
    <dl className="grid gap-3 sm:grid-cols-3">
      <Tile label={translate('income')}>
        <Amount minor={totals.incomeFactMinor} currency={currency} kind="income" size="m" />
        <IncomePlanNote planMinor={data.incomePlanMinor} />
      </Tile>
      <Tile label={translate('expense')}>
        <Amount minor={-totals.expenseFactMinor} currency={currency} size="m" />
        <span className="text-caption text-text-secondary">{limits}</span>
      </Tile>
      <Tile label={translate('result')}>
        <Amount
          minor={totals.resultMinor}
          currency={currency}
          kind={totals.resultMinor >= 0 ? 'income' : 'fact'}
          size="m"
        />
        <span className="text-caption text-text-secondary">{translate('resultNote')}</span>
      </Tile>
    </dl>
  )
}
