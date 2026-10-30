import { useQuery } from '@tanstack/react-query'
import { useLedger } from '@/contexts/ledger.context'
import { useLedgerWrite } from '@/lib/query/use-ledger-write.hook'
import { saveRate } from '../api/currencies.api'
import { currenciesQueries } from '../api/currencies.queries'

export function useRates() {
  const { ledgerId } = useLedger()

  return useQuery(currenciesQueries.rates(ledgerId))
}

export const useSaveRate = () => useLedgerWrite(saveRate)
