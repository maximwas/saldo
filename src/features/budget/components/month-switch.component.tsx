import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button.component'
import { useBudgetMonthParam } from '../hooks/budget.hook'
import { useMonthLabel } from '../hooks/month-label.hook'
import { shiftMonth } from '../utils/budget.utils'

type MonthSwitchProps = {
  month: string
}

// the card title of the frames (the month and year) with the arrows after it: the frames show no switch, the screen needs one
export function MonthSwitch({ month }: MonthSwitchProps) {
  const translate = useTranslations('budget.month')
  const monthLabel = useMonthLabel()
  const [, setMonth] = useBudgetMonthParam()

  return (
    <div className="flex items-center gap-1">
      <h2 className="mr-2 text-card-title text-text-primary first-letter:uppercase">{monthLabel(month)}</h2>
      <Button
        variant="ghost"
        size="s"
        aria-label={translate('previous')}
        onClick={() => setMonth(shiftMonth(month, -1))}
      >
        <ChevronLeft className="size-5" aria-hidden />
      </Button>
      <Button variant="ghost" size="s" aria-label={translate('next')} onClick={() => setMonth(shiftMonth(month, 1))}>
        <ChevronRight className="size-5" aria-hidden />
      </Button>
    </div>
  )
}
