import { Copy } from 'lucide-react'
import { Button } from '@/components/ui/button.component'
import { Card } from '@/components/ui/card.component'
import { useCanWrite } from '@/contexts/ledger.context'
import type { BudgetMonth } from '../api/budget.api'
import { useCopyToNext } from '../hooks/copy-month.hook'
import { MonthSwitch } from './month-switch.component'
import { SummaryTiles } from './summary-tiles.component'

type MonthCardProps = {
  data: BudgetMonth
  month: string
}

// Figma frames 2:12883 (desktop) / 2:16124 (mobile): the month, "copy to next month" as the card action on desktop and
// as a full-width button under the tiles on mobile, then the facts of the month.
// The «not expenses» strip (transfers, reserves) and the planned-payments figures are left out: their data is not in
// the budget feature.
export function MonthCard({ data, month }: MonthCardProps) {
  const canWrite = useCanWrite()
  const copy = useCopyToNext(month)
  const canCopy = canWrite && data.facts.some((fact) => fact.limitId !== null)

  return (
    <Card
      title={<MonthSwitch month={month} />}
      action={
        canCopy
          ? {
              label: copy.label,
              onClickAction: copy.run,
              className: 'max-lg:hidden',
            }
          : undefined
      }
      className="gap-4 lg:gap-5"
    >
      <div className="flex flex-col gap-3 lg:gap-5">
        <SummaryTiles data={data} month={month} />
        {canCopy ? (
          <Button variant="secondary" disabled={copy.pending} onClick={copy.run} className="lg:hidden">
            <Copy className="size-5" aria-hidden />
            {copy.label}
          </Button>
        ) : null}
      </div>
    </Card>
  )
}
