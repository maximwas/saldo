import { useQuery } from '@tanstack/react-query'
import { useClock } from '@/contexts/clock.context'
import { useLedger } from '@/contexts/ledger.context'
import { defineWrites } from '@/lib/query/ledger-writes.mutations'
import { useLedgerWrite } from '@/lib/query/use-ledger-write.hook'
import { localDate } from '@/lib/utils/clock.utils'
import { adjustBalance, createAccount, updateAccount } from '../api/accounts.api'
import { accountsQueries } from '../api/accounts.queries'

/** this feature's writes in the device's queue; AppProviders registers them before the cache is restored */
export const accountsWrites = defineWrites('accounts', {
  createAccount,
  updateAccount,
  adjustBalance,
})

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

export function useRecentTransfers() {
  const { ledgerId } = useLedger()

  return useQuery(accountsQueries.recentTransfers(ledgerId))
}

export function useAccountActivity(accountId: string, enabled: boolean) {
  const { ledgerId } = useLedger()

  return useQuery({
    ...accountsQueries.activity(ledgerId, accountId),
    enabled,
  })
}

export const useCreateAccount = () => useLedgerWrite(accountsWrites.createAccount)

export const useUpdateAccount = () => useLedgerWrite(accountsWrites.updateAccount)

export const useAdjustBalance = () => useLedgerWrite(accountsWrites.adjustBalance)
