import { useQuery } from '@tanstack/react-query'
import type { Route } from 'next'
import { useRouter } from 'next/navigation'
import { useLedger } from '@/contexts/ledger.context'
import { useLedgerWrite } from '@/lib/query/use-ledger-write.hook'
import { replaceCreditSchedule, saveCredit } from '../api/credits.api'
import { creditQueries } from '../api/credits.queries'

export function useCredits() {
  return useQuery(creditQueries.list(useLedger().ledgerId))
}

export const useSaveCredit = () => useLedgerWrite(saveCredit)

export const useReplaceCreditSchedule = () => useLedgerWrite(replaceCreditSchedule)

/** an installment is an obligation: «Paid» is the confirm sheet of Upcoming payments (?pay=<id>), one flow for all */
export function usePayInstallment() {
  const router = useRouter()

  return (installmentId: string) => router.push(`/payments?pay=${installmentId}` as Route)
}
