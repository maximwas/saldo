import { useQuery } from '@tanstack/react-query'
import { useLedger } from '@/contexts/ledger.context'
import { defineWrites } from '@/lib/query/ledger-writes.mutations'
import { useLedgerWrite } from '@/lib/query/use-ledger-write.hook'
import { archiveCategory, createCategory, reorderCategories, updateCategory } from '../api/categories.api'
import { categoriesQueries } from '../api/categories.queries'

/** this feature's writes in the device's queue; AppProviders registers them before the cache is restored */
export const categoriesWrites = defineWrites('categories', {
  createCategory,
  updateCategory,
  reorderCategories,
  archiveCategory,
})

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

export const useCreateCategory = () => useLedgerWrite(categoriesWrites.createCategory)

export const useUpdateCategory = () => useLedgerWrite(categoriesWrites.updateCategory)

export const useReorderCategories = () => useLedgerWrite(categoriesWrites.reorderCategories)

export const useArchiveCategory = () => useLedgerWrite(categoriesWrites.archiveCategory)
