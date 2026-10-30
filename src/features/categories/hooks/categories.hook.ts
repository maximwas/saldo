import { useQuery } from '@tanstack/react-query'
import { useLedger } from '@/contexts/ledger.context'
import { useLedgerWrite } from '@/lib/query/use-ledger-write.hook'
import { archiveCategory, createCategory, reorderCategories, updateCategory } from '../api/categories.api'
import { categoriesQueries } from '../api/categories.queries'

export function useCategories() {
  const { ledgerId } = useLedger()

  return useQuery(categoriesQueries.list(ledgerId))
}

/** `categoryIds` empty = nothing to count (the sheet is closed) */
export function useCategoryOperationCount(categoryIds: string[]) {
  const { ledgerId } = useLedger()

  return useQuery({
    ...categoriesQueries.operationCount(ledgerId, categoryIds),
    enabled: categoryIds.length > 0,
  })
}

export const useCreateCategory = () => useLedgerWrite(createCategory)

export const useUpdateCategory = () => useLedgerWrite(updateCategory)

export const useReorderCategories = () => useLedgerWrite(reorderCategories)

export const useArchiveCategory = () => useLedgerWrite(archiveCategory)
