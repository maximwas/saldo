import { useQuery } from '@tanstack/react-query'
import { useLedgerStore } from '@/contexts/ledger.context'
import { defineWrites } from '@/lib/query/ledger-writes.mutations'
import { useLedgerWrite } from '@/lib/query/use-ledger-write.hook'
import { addDebtMovement, closeDebt, saveDebt } from '../api/debts.api'
import { debtQueries } from '../api/debts.queries'

/** this feature's writes in the device's queue; AppProviders registers them before the cache is restored */
export const debtsWrites = defineWrites('debts', {
  saveDebt,
  addDebtMovement,
  closeDebt,
})

export const useDebts = () => useQuery(debtQueries.list(useLedgerStore((ledger) => ledger.ledgerId)))

export const useDebtAccounts = () => useQuery(debtQueries.accounts(useLedgerStore((ledger) => ledger.ledgerId)))

export function usePurchases(enabled: boolean) {
  return useQuery({
    ...debtQueries.purchases(useLedgerStore((ledger) => ledger.ledgerId)),
    enabled,
  })
}

export const useSaveDebt = () => useLedgerWrite(debtsWrites.saveDebt)

export const useAddDebtMovement = () => useLedgerWrite(debtsWrites.addDebtMovement)

export const useCloseDebt = () => useLedgerWrite(debtsWrites.closeDebt)
