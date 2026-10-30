import { Copy } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button.component'
import { notify } from '@/components/ui/toaster.component'
import { useCanWrite, useLedgerStore } from '@/contexts/ledger.context'
import type { BudgetMonth } from '../api/budget.api'
import { useBudgetMonthParam, useCopyBudgetMonth } from '../hooks/budget.hook'
import { useMonthLabel } from '../hooks/month-label.hook'
import { shiftMonth } from '../utils/budget.utils'
import { MonthSwitch } from './month-switch.component'
import { SummaryTiles } from './summary-tiles.component'

type MonthCardProps = {
  data: BudgetMonth
  month: string
}

/** "copy to next month": limits and the income plan go to the next month, then the screen follows them */
function CopyToNext({ month }: { month: string }) {
  const translate = useTranslations('budget.copy')
  const monthLabel = useMonthLabel()
  const ledgerId = useLedgerStore((ledger) => ledger.ledgerId)
  const [, setMonth] = useBudgetMonthParam()
  const copy = useCopyBudgetMonth()
  const next = shiftMonth(month, 1)

  const run = () =>
    copy.mutate(
      {
        ledgerId,
        from: month,
        to: next,
      },
      {
        onSuccess: (count) => {
          notify.success(Number(count) > 0 ? translate('done', { count: Number(count) }) : translate('nothing'))
          void setMonth(next)
        },
      },
    )

  return (
    <Button variant="secondary" size="s" disabled={copy.isPending} onClick={run}>
      <Copy className="size-4" aria-hidden />
      {translate('toNext', { month: monthLabel(next, false) })}
    </Button>
  )
}

// Figma frame 2:12799: the month with its switch and "copy to next month", then facts of the month.
// The planned-payments tile of the frame is left out: it needs the calendar totals (not part of this feature).
export function MonthCard({ data, month }: MonthCardProps) {
  const canWrite = useCanWrite()
  const hasLimits = data.facts.some((fact) => fact.limitId !== null)

  return (
    <section className="flex flex-col gap-4 rounded-card bg-card p-5 shadow-card lg:p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <MonthSwitch month={month} />
        {canWrite && hasLimits ? <CopyToNext month={month} /> : null}
      </header>
      <SummaryTiles data={data} />
    </section>
  )
}
