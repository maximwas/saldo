import { useTranslations } from 'next-intl'
import { notify } from '@/components/ui/toaster.component'
import { useLedgerStore } from '@/contexts/ledger.context'
import { useDayText } from '@/lib/dates/day-text.hook'
import { shiftMonth } from '../utils/budget.utils'
import { useBudgetMonthParam, useCopyBudgetMonth } from './budget.hook'

/** "copy to next month": limits and the income plan go to the next month, then the screen follows them */
export function useCopyToNext(month: string) {
  const translate = useTranslations('budget.copy')
  const dayText = useDayText()
  const ledgerId = useLedgerStore((ledger) => ledger.ledgerId)
  const [, setMonth] = useBudgetMonthParam()
  const copy = useCopyBudgetMonth()
  const next = shiftMonth(month, 1)

  return {
    label: translate('toNext', { month: dayText(next, 'month') }),
    pending: copy.isPending,
    run: () =>
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
      ),
  }
}
