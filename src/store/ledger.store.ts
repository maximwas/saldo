import { createStore } from 'zustand/vanilla'
import type { LedgerRole } from '@/types/supabase.types'

export type LedgerSummary = {
  id: string
  name: string
  role: LedgerRole
}
export type ActiveLedger = {
  ledgerId: string
  role: LedgerRole
  timeZone: string
  baseCurrency: string
  ledgers: LedgerSummary[]
}

// A factory, never a module-level store: the state is the signed-in user's data, so every request / provider mount
// builds its own store (zustand's Next.js App Router pattern). LedgerProvider injects it through context.
export const createLedgerStore = (ledger: ActiveLedger) => createStore<ActiveLedger>()(() => ledger)

export type LedgerStore = ReturnType<typeof createLedgerStore>
