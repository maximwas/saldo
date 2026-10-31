import { useBudgetSheetStore } from '@/store/budget-sheet.store'
import { DeleteLimitSheet } from './delete-limit-sheet.component'
import { IncomePlanSheet } from './income-plan-sheet.component'
import { LimitSheet } from './limit-sheet.component'

/** the open sheet of the budget screen; the key remounts a sheet when another one takes its place */
export function BudgetSheets() {
  const sheet = useBudgetSheetStore((state) => state.sheet)

  switch (sheet?.kind) {
    case 'limit':
      return <LimitSheet key={`limit-${sheet.categoryId}`} categoryId={sheet.categoryId} />
    case 'delete':
      return <DeleteLimitSheet key={`delete-${sheet.categoryId}`} categoryId={sheet.categoryId} />
    case 'income':
      return <IncomePlanSheet key="income" />
    default:
      return null
  }
}
