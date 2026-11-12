import { useQuery } from '@tanstack/react-query'
import type { Route } from 'next'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useMoneyText } from '@/components/ui/amount.component'
import { useLedger } from '@/contexts/ledger.context'
import { useLedgerWrite } from '@/lib/query/ledger-write.hook'
import { defineWrites } from '@/lib/query/ledger-writes.mutations'
import { type Credit, replaceCreditSchedule, saveCredit } from '../api/credits.api'
import { creditQueries } from '../api/credits.queries'
import { installmentParts } from '../utils/credits.utils'

/** this feature's writes in the device's queue; AppProviders registers them before the cache is restored */
export const creditsWrites = defineWrites('credits', {
  saveCredit,
  replaceCreditSchedule,
})

/** «1 249,92 × 12», or «1 249,92 × 11 + 1 249,88» when the last installment differs: the parts add up to the schedule */
export function useInstallmentsText() {
  const translate = useTranslations('credits')
  const moneyText = useMoneyText()

  return (credit: Credit) => {
    const parts = installmentParts(credit)
    const amount = moneyText(parts.regularMinor, credit.currency)

    return parts.lastMinor === null
      ? translate('perInstallment', {
          amount,
          count: parts.count,
        })
      : translate('perInstallmentLast', {
          amount,
          count: parts.count,
          last: moneyText(parts.lastMinor, credit.currency),
        })
  }
}

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
