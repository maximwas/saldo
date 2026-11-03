import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button.component'
import { Card } from '@/components/ui/card.component'
import { CategoryIcon } from '@/components/ui/category-icon.component'
import { notify } from '@/components/ui/toaster.component'
import { useCanWrite, useLedgerStore } from '@/contexts/ledger.context'
import { useBudgetSheetStore } from '@/store/budget-sheet.store'
import { useCopyBudgetMonth } from '../hooks/budget.hook'
import { useMonthLabel, useMonthOf } from '../hooks/month-label.hook'
import { shiftMonth } from '../utils/budget.utils'
import { MonthSwitch } from './month-switch.component'

// Figma frames 41:107591 (desktop) / 2:28501 (mobile): the month card with an empty state: a blue wallet badge, title,
// text, «Copy from the previous month» (secondary) and «Add a limit» (ghost): without it a month with nothing to copy
// could not be started.
export function BudgetEmpty({ month }: { month: string }) {
  const translate = useTranslations('budget')
  const monthLabel = useMonthLabel()
  const monthOf = useMonthOf()
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
    <Card title={<MonthSwitch month={month} />}>
      <div className="flex flex-col items-center gap-3 p-2 text-center">
        <CategoryIcon icon="wallet" color="blue" />
        <h3 className="self-stretch text-body font-semibold text-text-primary">
          {translate('empty.title', { month: monthLabel(month, false) })}
        </h3>
        <p className="self-stretch text-label text-text-secondary">
          {translate('empty.text', { month: monthOf(previous) })}
        </p>
        {canWrite ? (
          <div className="flex flex-wrap justify-center gap-3">
            <Button variant="secondary" disabled={copy.isPending} onClick={copyFromPrevious}>
              {translate('copy.fromPrevious', { month: monthOf(previous) })}
            </Button>
            <Button
              variant="ghost"
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
      </div>
    </Card>
  )
}
