import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useLedger } from '@/contexts/ledger.context'
import { defineWrites } from '@/lib/query/ledger-writes.mutations'
import { useLedgerWrite } from '@/lib/query/use-ledger-write.hook'
import { saveCalendarFilter } from '../api/calendar.api'
import { calendarQueries } from '../api/calendar.queries'
import { periodRange } from '../utils/calendar.utils'
import { useCalendarParams } from './calendar-params.hook'

/** this feature's writes in the device's queue; AppProviders registers them before the cache is restored */
export const calendarWrites = defineWrites('calendar', {
  saveCalendarFilter,
})

/** entries and day totals of the period the URL shows; the previous period stays on screen while the next loads */
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

  return {
    params,
    entries,
    totals,
  }
}

export const useSavedFilters = () => useQuery(calendarQueries.saved(useLedger().ledgerId))

export const useCalendarOptions = () => useQuery(calendarQueries.options(useLedger().ledgerId))

export const useSaveCalendarFilter = () => useLedgerWrite(calendarWrites.saveCalendarFilter)
