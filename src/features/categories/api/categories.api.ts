import { versionConflict } from '@/lib/supabase/version-conflict.utils'
import type { SaldoClient } from '@/types/supabase.types'
import { type ArchiveCategoryInput, archiveCategoryInputSchema } from '../schemas/archive-category-input.schema'
import {
  type CreateCategoryInput,
  createCategoryInputSchema,
  type UpdateCategoryInput,
  updateCategoryInputSchema,
} from '../schemas/category-input.schema'
import { type CategoryView, type SortChange, toCategory } from '../utils/categories.utils'

/** every category of the space, active and archived; the tree is built from the flat list (categories.utils) */
export async function getCategories(supabase: SaldoClient, ledgerId: string): Promise<CategoryView[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('id, kind, parent_id, name, color, icon, sort_order, archived_at, version')
    .eq('ledger_id', ledgerId)
    .order('sort_order')

  if (error) {
    throw error
  }

  return data.map(toCategory)
}

type CountOperationsParams = {
  ledgerId: string
  categoryIds: string[]
}

/** operations (any kind) of these categories: tells the archive dialog whether there is anything to move */
export async function countCategoryOperations(
  supabase: SaldoClient,
  { ledgerId, categoryIds }: CountOperationsParams,
): Promise<number> {
  const { count, error } = await supabase
    .from('operations')
    .select('id', {
      count: 'exact',
      head: true,
    })
    .eq('ledger_id', ledgerId)
    .in('category_id', categoryIds)

  if (error) {
    throw error
  }

  return count ?? 0
}

export async function createCategory(supabase: SaldoClient, input: CreateCategoryInput): Promise<void> {
  const row = createCategoryInputSchema.parse(input)
  // a repeated id (a replayed offline write) hits the primary key and is not a second category
  const { error } = await supabase.from('categories').upsert(row, {
    onConflict: 'id',
    ignoreDuplicates: true,
  })

  if (error) {
    throw error
  }
}

export async function updateCategory(supabase: SaldoClient, input: UpdateCategoryInput): Promise<void> {
  const { id, expectedVersion, patch } = updateCategoryInputSchema.parse(input)
  const { data, error } = await supabase
    .from('categories')
    .update(patch)
    .eq('id', id)
    .eq('version', expectedVersion)
    .select('id')
    .maybeSingle()

  if (error) {
    throw error
  }

  if (!data) {
    throw versionConflict()
  }
}

/** a new order of any categories in one transaction (RPC reorder_categories); a stale version raises PT409 */
export async function reorderCategories(supabase: SaldoClient, changes: SortChange[]): Promise<void> {
  const { error } = await supabase.rpc('reorder_categories', {
    p_items: changes.map((change) => ({
      id: change.id,
      version: change.version,
      sort_order: change.sortOrder,
    })),
  })

  if (error) {
    throw error
  }
}

/** archive with moving operations: the RPC re-points operations and obligations, then archives category and children */
export async function archiveCategory(supabase: SaldoClient, input: ArchiveCategoryInput): Promise<void> {
  const { id, moveTo } = archiveCategoryInputSchema.parse(input)
  const { error } = await supabase.rpc('archive_category', {
    p_id: id,
    p_move_to: moveTo ?? undefined,
  })

  if (error) {
    throw error
  }
}

/** delete with moving: the RPC re-points operations, obligations and subscriptions, then deletes category and children */
export async function deleteCategory(supabase: SaldoClient, input: ArchiveCategoryInput): Promise<void> {
  const { id, moveTo } = archiveCategoryInputSchema.parse(input)
  const { error } = await supabase.rpc('delete_category', {
    p_id: id,
    p_move_to: moveTo ?? undefined,
  })

  if (error) {
    throw error
  }
}

/** operations per category for the operations-count line; categories without operations are absent */
export async function getCategoryOperationCounts(
  supabase: SaldoClient,
  ledgerId: string,
): Promise<Record<string, number>> {
  const { data, error } = await supabase
    .from('category_operation_counts')
    .select('category_id, operation_count')
    .eq('ledger_id', ledgerId)

  if (error) {
    throw error
  }

  return Object.fromEntries(
    data.flatMap((row) => (row.category_id ? [[row.category_id, row.operation_count ?? 0]] : [])),
  )
}
