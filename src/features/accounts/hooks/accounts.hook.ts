import { useQuery } from '@tanstack/react-query'
import { useClock } from '@/contexts/clock.context'
import { useLedger } from '@/contexts/ledger.context'
import { useLedgerWrite } from '@/lib/query/use-ledger-write.hook'
import { localDate } from '@/lib/utils/clock.utils'
import { adjustBalance, createAccount, updateAccount } from '../api/accounts.api'
import { accountsQueries } from '../api/accounts.queries'

export function useAccounts() {
  const { ledgerId, timeZone } = useLedger()
  const clock = useClock()

  return useQuery(
    accountsQueries.list({
      ledgerId,
      today: localDate(clock.now(), timeZone),
    }),
  )
}

export function useAccountOperationCount(accountId: string, enabled: boolean) {
  const { ledgerId } = useLedger()

  return useQuery({
    ...accountsQueries.operationCount(ledgerId, accountId),
    enabled,
  })
}

export const useCreateAccount = () => useLedgerWrite(createAccount)

export const useUpdateAccount = () => useLedgerWrite(updateAccount)

export const useAdjustBalance = () => useLedgerWrite(adjustBalance)
