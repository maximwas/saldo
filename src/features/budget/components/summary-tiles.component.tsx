import { Pencil } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Amount, useMoneyText } from '@/components/ui/amount.component'
import { Button } from '@/components/ui/button.component'
import { useCanWrite, useLedgerStore } from '@/contexts/ledger.context'
import { cn } from '@/lib/utils/cn.utils'
import { useBudgetSheetStore } from '@/store/budget-sheet.store'
import type { BudgetMonth } from '../api/budget.api'
import { usePlannedToMonthEnd } from '../hooks/budget.hook'
import { budgetTotals } from '../utils/budget.utils'

type TileProps = {
  label: string
  /** a one-line note under the label (mobile) or under the amount (desktop) */
  caption: React.ReactNode
  amount: React.ReactNode
  /** mobile: the note runs under the label and the amount, not beside it */
  wideCaption?: boolean
}

// Figma «Saldo» → phase 4 budget: desktop 2:12895 is a column (label, amount M, caption) in radius/inner, padding 16, gap 4;
// mobile 2:16134 is a row (label over caption, amount S at the end) in radius/md, padding 12/16, gap 12/2
function Tile({ label, caption, amount, wideCaption }: TileProps) {
  return (
    <div className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-0.5 rounded-md bg-subtle px-4 py-3 lg:flex lg:flex-1 lg:flex-col lg:items-stretch lg:gap-1 lg:rounded-inner lg:p-4">
      <dt className="text-label font-medium text-text-primary lg:order-1 lg:text-text-secondary">{label}</dt>
      <dd
        className={cn(
          'col-start-2 row-start-1 flex justify-end lg:order-2 lg:justify-start',
          !wideCaption && 'row-span-2',
        )}
      >
        {amount}
      </dd>
      <dd
        className={cn(
          'flex items-center gap-1 text-caption text-text-secondary lg:order-3 lg:text-label',
          wideCaption ? 'col-span-2' : 'col-start-1',
        )}
      >
        {caption}
      </dd>
    </div>
  )
}

function IncomePlanNote({ planMinor }: { planMinor: number | null }) {
  const translate = useTranslations('budget.summary')
  const moneyText = useMoneyText()
  const currency = useLedgerStore((ledger) => ledger.baseCurrency)
  const canWrite = useCanWrite()
  const open = useBudgetSheetStore((state) => state.open)
  const text =
    planMinor === null
      ? translate('incomePlanNone')
      : translate('incomePlan', { amount: moneyText(planMinor, currency) })

  return (
    <>
      {text}
      {canWrite ? (
        <Button
          variant="ghost"
          size="s"
          // 22x24 in the tile: the ::after of Button s grows to a 46x48 tap target
          className="h-6 px-1 after:-inset-3"
          aria-label={translate('editIncomePlan')}
          onClick={() => open({ kind: 'income' })}
        >
          <Pencil className="size-3.5" aria-hidden />
        </Button>
      ) : null}
    </>
  )
}

type TileAmountProps = {
  minor: number
  kind?: 'income' | 'fact'
}

// the frames set Size S on mobile and M on desktop
function TileAmount({ minor, kind }: TileAmountProps) {
  const currency = useLedgerStore((ledger) => ledger.baseCurrency)

  return (
    <>
      <Amount minor={minor} currency={currency} kind={kind} size="s" className="lg:hidden" />
      <Amount minor={minor} currency={currency} kind={kind} size="m" className="max-lg:hidden" />
    </>
  )
}

// income, expenses and the result of the month; only the fact: a plan is never summed into it (§12)
type SummaryTilesProps = {
  data: BudgetMonth
  month: string
}

export function SummaryTiles({ data, month }: SummaryTilesProps) {
  const translate = useTranslations('budget.summary')
  const moneyText = useMoneyText()
  const currency = useLedgerStore((ledger) => ledger.baseCurrency)
  const totals = budgetTotals(data.facts)
  const limits =
    totals.limitsMinor > 0
      ? translate('limitsTotal', { amount: moneyText(totals.limitsMinor, currency) })
      : translate('limitsNone')
  const plannedMinor = usePlannedToMonthEnd(month)
  // Figma 2:12934 / 2:16178: the result with the plans due by the end of this month; other months keep the note
  const withPlanMinor = plannedMinor === null ? null : totals.resultMinor - plannedMinor

  return (
    <dl className="flex flex-col gap-3 lg:flex-row lg:gap-4">
      <Tile
        label={translate('income')}
        caption={<IncomePlanNote planMinor={data.incomePlanMinor} />}
        amount={<TileAmount minor={totals.incomeFactMinor} kind="income" />}
      />
      <Tile label={translate('expense')} caption={limits} amount={<TileAmount minor={-totals.expenseFactMinor} />} />
      <Tile
        label={translate('result')}
        caption={
          withPlanMinor === null
            ? translate('resultNote')
            : translate('withPlan', {
                amount: `${withPlanMinor > 0 ? '+' : ''}${moneyText(withPlanMinor, currency)}`,
              })
        }
        amount={<TileAmount minor={totals.resultMinor} kind={totals.resultMinor >= 0 ? 'income' : 'fact'} />}
        wideCaption
      />
    </dl>
  )
}
