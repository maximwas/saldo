import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useToday } from '@/contexts/clock.context'
import { useLedger } from '@/contexts/ledger.context'
import { useLedgerWrite } from '@/lib/query/ledger-write.hook'
import { defineWrites } from '@/lib/query/ledger-writes.mutations'
import { saveRate, setMyPinnedCurrencies } from '../api/currencies.api'
import { currenciesQueries } from '../api/currencies.queries'
import { rateBoard } from '../utils/currencies.utils'

/** this feature's writes in the device's queue; AppProviders registers them before the cache is restored */
export const currenciesWrites = defineWrites('currencies', {
  saveRate,
  setMyPinnedCurrencies,
})

/** at most three rates on the Overview (Maxim, 3.11; the RPC refuses a fourth) */
export const MAX_PINNED = 3

export function useRates() {
  const { ledgerId } = useLedger()

  return useQuery(currenciesQueries.rates(ledgerId))
}

/** the rates of the account pairs, newest first: the history in Settings → Currencies */
export function useRateHistory() {
  const { ledgerId } = useLedger()

  return useQuery(currenciesQueries.history(ledgerId))
}

export const useSaveRate = () => useLedgerWrite(currenciesWrites.saveRate)

/**
 * The member's pinned rates. A tick shows at once (the cache is set before the write); a failed write shows the
 * errors.db toast and the refetch puts the old pins back. Only the last of several quick ticks refetches, so an
 * earlier answer does not undo a later tick for a moment.
 */
function usePinnedCurrencies() {
  const { ledgerId } = useLedger()
  const queryClient = useQueryClient()
  const options = currenciesQueries.pinned(ledgerId)
  const query = useQuery(options)
  const write = useLedgerWrite(currenciesWrites.setMyPinnedCurrencies)

  function save(currencies: string[]) {
    void queryClient.cancelQueries({ queryKey: options.queryKey })
    queryClient.setQueryData(options.queryKey, currencies)
    write.mutate(
      {
        ledgerId,
        currencies,
      },
      {
        onSettled: () => {
          if (queryClient.isMutating({ mutationKey: currenciesWrites.setMyPinnedCurrencies.key }) === 0) {
            void queryClient.invalidateQueries({ queryKey: options.queryKey })
          }
        },
      },
    )
  }

  return {
    query,
    save,
  }
}

/**
 * Today's rate of every currency with the member's pins, for the Overview card, the phone strip and the all-rates
 * sheet. `nbuDay` is the newest day NBU gave a rate for (null before the first cron run); a pinned base currency is
 * left out, since its rate is 1.
 */
export function useRateBoard() {
  const today = useToday()
  const rates = useRates()
  const { query: pinnedQuery, save } = usePinnedCurrencies()
  const queries = [rates, pinnedQuery]

  if (rates.data === undefined || pinnedQuery.data === undefined) {
    return {
      queries,
      data: undefined,
      save,
    }
  }

  const { baseCurrency } = rates.data
  const board = rateBoard(rates.data.rates, baseCurrency, today, pinnedQuery.data)
  const nbuDays = board.flatMap((row) =>
    row.rateOn !== null && (!row.manual || row.nbuRate !== null) ? [row.rateOn] : [],
  )

  return {
    queries,
    data: {
      baseCurrency,
      board,
      pinned: pinnedQuery.data.filter((currency) => currency !== baseCurrency),
      nbuDay: nbuDays.sort().at(-1) ?? null,
    },
    save,
  }
}
