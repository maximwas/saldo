import { useQuery } from '@tanstack/react-query'
import { useLedger } from '@/contexts/ledger.context'
import { defineWrites } from '@/lib/query/ledger-writes.mutations'
import { useLedgerWrite } from '@/lib/query/use-ledger-write.hook'
import { saveRate } from '../api/currencies.api'
import { currenciesQueries } from '../api/currencies.queries'

/** this feature's writes in the device's queue; AppProviders registers them before the cache is restored */
export const currenciesWrites = defineWrites('currencies', {
  saveRate,
})

export function useRates() {
  const { ledgerId } = useLedger()

  return useQuery(currenciesQueries.rates(ledgerId))
}

export const useSaveRate = () => useLedgerWrite(currenciesWrites.saveRate)
