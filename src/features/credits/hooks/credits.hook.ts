import { useQuery } from '@tanstack/react-query'
import type { Route } from 'next'
import { useRouter } from 'next/navigation'
import { useLedger } from '@/contexts/ledger.context'
import { defineWrites } from '@/lib/query/ledger-writes.mutations'
import { useLedgerWrite } from '@/lib/query/use-ledger-write.hook'
import { replaceCreditSchedule, saveCredit } from '../api/credits.api'
import { creditQueries } from '../api/credits.queries'

/** this feature's writes in the device's queue; AppProviders registers them before the cache is restored */
export const creditsWrites = defineWrites('credits', {
  saveCredit,
  replaceCreditSchedule,
})

export function useCredits() {
  return useQuery(creditQueries.list(useLedger().ledgerId))
}

export const useSaveCredit = () => useLedgerWrite(creditsWrites.saveCredit)

export const useReplaceCreditSchedule = () => useLedgerWrite(creditsWrites.replaceCreditSchedule)

/** an installment is an obligation: «Paid» is the confirm sheet of Upcoming payments (?pay=<id>), one flow for all */
export function usePayInstallment() {
  const router = useRouter()

  return (installmentId: string) => router.push(`/payments?pay=${installmentId}` as Route)
}
