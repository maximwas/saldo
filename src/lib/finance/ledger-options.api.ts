import type { CURRENCIES } from '@/constants/currencies.constants'
import type { SaldoClient } from '@/types/supabase.types'

export type LedgerAccountOption = {
  id: string
  name: string
  currency: (typeof CURRENCIES)[number]
  archived: boolean
}

export type LedgerCategoryOption = {
  id: string
  name: string
  kind: 'income' | 'expense'
  /** a token name from theme.css (the CATEGORY_COLORS names) or null */
  color: string | null
  /** a key of CATEGORY_ICONS or null */
  icon: string | null
  parentId: string | null
  archived: boolean
}

type AccountOptionRow = {
  id: string
  name: string
  currency: string
  archived_at: string | null
}

const toAccountOption = (row: AccountOptionRow): LedgerAccountOption => ({
  id: row.id,
  name: row.name,
  currency: row.currency as LedgerAccountOption['currency'],
  archived: row.archived_at !== null,
})

type CategoryOptionRow = {
  id: string
  name: string
  kind: string
  color: string | null
  icon: string | null
  parent_id: string | null
  archived_at: string | null
}

const toCategoryOption = (row: CategoryOptionRow): LedgerCategoryOption => ({
  id: row.id,
  name: row.name,
  kind: row.kind === 'income' ? 'income' : 'expense',
  color: row.color,
  icon: row.icon,
  parentId: row.parent_id,
  archived: row.archived_at !== null,
})

/** every account of the space, archived ones flagged: forms drop them, the list still names them */
export async function listAccountOptions(supabase: SaldoClient, ledgerId: string): Promise<LedgerAccountOption[]> {
  const { data, error } = await supabase
    .from('accounts')
    .select('id, name, currency, archived_at')
    .eq('ledger_id', ledgerId)
    .order('sort_order')

  if (error) {
    throw error
  }

  return data.map(toAccountOption)
}

export async function listCategoryOptions(supabase: SaldoClient, ledgerId: string): Promise<LedgerCategoryOption[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('id, name, kind, color, icon, parent_id, archived_at')
    .eq('ledger_id', ledgerId)
    .order('sort_order')

  if (error) {
    throw error
  }

  return data.map(toCategoryOption)
}
