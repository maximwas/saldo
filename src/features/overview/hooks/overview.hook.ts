import { useQuery } from '@tanstack/react-query'
import { useClock } from '@/contexts/clock.context'
import { useLedger } from '@/contexts/ledger.context'
import { defineWrites } from '@/lib/query/ledger-writes.mutations'
import { useLedgerWrite } from '@/lib/query/use-ledger-write.hook'
import { localDate } from '@/lib/utils/clock.utils'
import { setNextIncomeOn } from '../api/overview.api'
import { overviewQueries } from '../api/overview.queries'

export function useOverview() {
  const { ledgerId, timeZone } = useLedger()
  const clock = useClock()

  return useQuery(
    overviewQueries.detail({
      ledgerId,
      timeZone,
      today: localDate(clock.now(), timeZone),
    }),
  )
}

/** this feature's writes in the device's queue; AppProviders registers them before the cache is restored */
export const overviewWrites = defineWrites('overview', {
  setNextIncomeOn,
})

// «Change» income date moves «Available» and the obligation lines (every write refetches the money views); the sheet
// shows a failed save itself
export const useSetIncomeDate = () =>
  useLedgerWrite(overviewWrites.setNextIncomeOn, {
    quiet: true,
  })
