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

  return data.map((account) => ({
    id: account.id,
    name: account.name,
    currency: account.currency as LedgerAccountOption['currency'],
    archived: account.archived_at !== null,
  }))
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

  return data.map((category) => ({
    id: category.id,
    name: category.name,
    kind: category.kind === 'income' ? 'income' : 'expense',
    color: category.color,
    icon: category.icon,
    parentId: category.parent_id,
    archived: category.archived_at !== null,
  }))
}
