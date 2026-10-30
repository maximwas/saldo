import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { isMoneyQuery } from '@/constants/query-roots.constants'
import { useClock } from '@/contexts/clock.context'
import { useLedger } from '@/contexts/ledger.context'
import { getBrowserSupabase } from '@/lib/supabase/browser-client'
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

/** «Change» income date: it moves «Available» and the obligation lines, so every money view refetches (also on a conflict) */
export function useSetIncomeDate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (params: Parameters<typeof setNextIncomeOn>[1]) => setNextIncomeOn(getBrowserSupabase(), params),
    onSettled: () => queryClient.invalidateQueries({ predicate: isMoneyQuery }),
  })
}
