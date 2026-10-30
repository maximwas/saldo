import { useQuery } from '@tanstack/react-query'
import { useClock } from '@/contexts/clock.context'
import { useLedger } from '@/contexts/ledger.context'
import { localDate } from '@/lib/utils/clock.utils'
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
