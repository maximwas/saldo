import { useQuery } from '@tanstack/react-query'
import { useLedgerStore } from '@/contexts/ledger.context'
import { useLedgerWrite } from '@/lib/query/use-ledger-write.hook'
import { addDebtMovement, closeDebt, saveDebt } from '../api/debts.api'
import { debtQueries } from '../api/debts.queries'

export const useDebts = () => useQuery(debtQueries.list(useLedgerStore((ledger) => ledger.ledgerId)))

export const useDebtAccounts = () => useQuery(debtQueries.accounts(useLedgerStore((ledger) => ledger.ledgerId)))

export function usePurchases(enabled: boolean) {
  return useQuery({
    ...debtQueries.purchases(useLedgerStore((ledger) => ledger.ledgerId)),
    enabled,
  })
}

export const useSaveDebt = () => useLedgerWrite(saveDebt)

export const useAddDebtMovement = () => useLedgerWrite(addDebtMovement)

export const useCloseDebt = () => useLedgerWrite(closeDebt)
