import { keepPreviousData, useQueries, useQuery } from '@tanstack/react-query'
import { useLedger } from '@/contexts/ledger.context'
import { lastInstallments } from '@/lib/finance/credit-installments.utils'
import { useLedgerWrite } from '@/lib/query/ledger-write.hook'
import { defineWrites } from '@/lib/query/ledger-writes.mutations'
import { type CalendarParams, cancelPlanEntry, saveCalendarFilter } from '../api/calendar.api'
import { calendarQueries } from '../api/calendar.queries'
import { paidMarks, periodRange } from '../utils/calendar.utils'
import { useCalendarParams } from './calendar-params.hook'

/** this feature's writes in the device's queue; AppProviders registers them before the cache is restored */
export const calendarWrites = defineWrites('calendar', {
  saveCalendarFilter,
  cancelPlanEntry,
})

/** the entries of the days outside the period on which its plans were paid, under the same filter: a plan of 05.11
 * paid on 28.10 still marks 05.11 in the day, the week and the month of 05.11 */
function useEntriesPaidElsewhere(params: CalendarParams) {
  const days = useQuery(calendarQueries.paidElsewhereDays(params))

  return useQueries({
    queries: (days.data ?? []).map((day) =>
      calendarQueries.entries({
        ...params,
        from: day,
        to: day,
      }),
    ),
    combine: (results) => results.flatMap((result) => result.data ?? []),
  })
}

/** entries and day totals of the period the URL shows; the previous period stays on screen while the next loads.
 * `marks` are the plan days' «Paid DD.MM» entries, `known` every entry on screen (the popup finds its entry there). */
export function useCalendarData() {
  const { ledgerId } = useLedger()
  const { view, date, filter } = useCalendarParams()
  const params = {
    ledgerId,
    ...periodRange(view, date),
    filter,
  }
  const entries = useQuery({
    ...calendarQueries.entries(params),
    placeholderData: keepPreviousData,
  })
  const totals = useQuery({
    ...calendarQueries.totals(params),
    placeholderData: keepPreviousData,
  })

  const known = [...(entries.data ?? []), ...useEntriesPaidElsewhere(params)]

  return {
    params,
    entries,
    totals,
    known,
    marks: paidMarks(known, params),
  }
}

export const useSavedFilters = () => useQuery(calendarQueries.saved(useLedger().ledgerId))

export const useCalendarOptions = () => useQuery(calendarQueries.options(useLedger().ledgerId))

/** «installment 3 of 12» of a credit's plan or payment; null when the entry is not a numbered installment */
export function useInstallmentOf() {
  const { data } = useQuery(calendarQueries.installments(useLedger().ledgerId))
  const installments = data ?? []
  const numbers = new Map(installments.map((installment) => [installment.obligationId, installment]))
  const totals = lastInstallments(installments)

  return (obligationId: string | null) => {
    const installment = obligationId ? numbers.get(obligationId) : undefined

    return installment
      ? {
          number: installment.sequenceNo,
          total: totals.get(installment.creditId) ?? installment.sequenceNo,
        }
      : null
  }
}

export const useSaveCalendarFilter = () => useLedgerWrite(calendarWrites.saveCalendarFilter)

export const useCancelPlanEntry = () => useLedgerWrite(calendarWrites.cancelPlanEntry)
