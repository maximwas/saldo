import type { SaldoClient } from '@/types/supabase.types'

// search_entities caps the limit at 50
const LIMIT = 30

/** accounts, categories, subscriptions, credits, debts, planned payments and operations of the space, best first */
export async function searchEntities(supabase: SaldoClient, ledgerId: string, query: string) {
  const { data, error } = await supabase.rpc('search_entities', {
    p_ledger_id: ledgerId,
    p_q: query,
    p_limit: LIMIT,
  })

  if (error) {
    throw error
  }

  return data
}

export type SearchResult = Awaited<ReturnType<typeof searchEntities>>[number]
