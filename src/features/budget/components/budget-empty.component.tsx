import { Wallet } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button.component'
import { notify } from '@/components/ui/toaster.component'
import { useCanWrite, useLedgerStore } from '@/contexts/ledger.context'
import { useBudgetSheetStore } from '@/store/budget-sheet.store'
import { useCopyBudgetMonth } from '../hooks/budget.hook'
import { useMonthLabel } from '../hooks/month-label.hook'
import { shiftMonth } from '../utils/budget.utils'
import { MonthSwitch } from './month-switch.component'

// Figma frame 2:28501: a month without a budget offers to copy the previous one or start empty
export function BudgetEmpty({ month }: { month: string }) {
  const translate = useTranslations('budget')
  const monthLabel = useMonthLabel()
  const ledgerId = useLedgerStore((ledger) => ledger.ledgerId)
  const canWrite = useCanWrite()
  const open = useBudgetSheetStore((state) => state.open)
  const copy = useCopyBudgetMonth()
  const previous = shiftMonth(month, -1)

  const copyFromPrevious = () =>
    copy.mutate(
      {
        ledgerId,
        from: previous,
        to: month,
      },
      {
        onSuccess: (count) =>
          notify.success(
            Number(count) > 0 ? translate('copy.done', { count: Number(count) }) : translate('copy.nothing'),
          ),
      },
    )

  return (
    <section className="flex flex-col items-center gap-3 rounded-card bg-card p-8 text-center shadow-card">
      <MonthSwitch month={month} />
      <span className="flex size-10 items-center justify-center rounded-full bg-primary-soft text-primary-text">
        <Wallet className="size-5" aria-hidden />
      </span>
      <h2 className="text-card-title text-text-primary">
        {translate('empty.title', { month: monthLabel(month, false) })}
      </h2>
      <p className="max-w-md text-label text-text-secondary">{translate('empty.text')}</p>
      {canWrite ? (
        <div className="flex flex-wrap justify-center gap-3">
          <Button variant="secondary" disabled={copy.isPending} onClick={copyFromPrevious}>
            {translate('copy.fromPrevious', { month: monthLabel(previous, false) })}
          </Button>
          <Button
            onClick={() =>
              open({
                kind: 'limit',
                categoryId: null,
              })
            }
          >
            {translate('empty.start')}
          </Button>
        </div>
      ) : null}
    </section>
  )
}
