import { useQuery } from '@tanstack/react-query'
import { parseAsString, useQueryState } from 'nuqs'
import { useToday } from '@/contexts/clock.context'
import { useLedgerStore } from '@/contexts/ledger.context'
import { defineWrites } from '@/lib/query/ledger-writes.mutations'
import { useLedgerWrite } from '@/lib/query/use-ledger-write.hook'
import { copyBudgetMonth, deleteLimit, saveLimit, setIncomePlan } from '../api/budget.api'
import { budgetQueries } from '../api/budget.queries'
import { resolveMonth } from '../utils/budget.utils'

/** this feature's writes in the device's queue; AppProviders registers them before the cache is restored */
export const budgetWrites = defineWrites('budget', {
  saveLimit,
  setIncomePlan,
  deleteLimit,
  copyBudgetMonth,
})

const useLedgerId = () => useLedgerStore((ledger) => ledger.ledgerId)

/** the month on screen, YYYY-MM: ?month= or the month of today; null in the URL = the current month */
export function useBudgetMonthParam() {
  const today = useToday()
  const [param, setParam] = useQueryState('month', parseAsString)

  return [resolveMonth(param, today), setParam] as const
}

const useBudgetMonth = (month: string) => useQuery(budgetQueries.month(useLedgerId(), month))

export const useBudgetCategories = () => useQuery(budgetQueries.categories(useLedgerId()))

export const useSaveLimit = () => useLedgerWrite(budgetWrites.saveLimit)

export const useSetIncomePlan = () => useLedgerWrite(budgetWrites.setIncomePlan)

export const useDeleteLimit = () => useLedgerWrite(budgetWrites.deleteLimit)

export const useCopyBudgetMonth = () => useLedgerWrite(budgetWrites.copyBudgetMonth)

/** the month on screen with its data: what the sheets and the cards read instead of getting it as props */
export function useCurrentBudget() {
  const [month] = useBudgetMonthParam()

  return {
    month,
    ...useBudgetMonth(month),
  }
}
