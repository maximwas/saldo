'use client'

import { createContext, use } from 'react'
import type { LedgerRole } from '@/types/supabase.types'

export type ActiveLedger = { ledgerId: string; role: LedgerRole; timeZone: string }

// null on /login and other signed-out pages
const LedgerContext = createContext<ActiveLedger | null>(null)

export function LedgerProvider({ ledger, children }: { ledger: ActiveLedger | null; children: React.ReactNode }) {
  return <LedgerContext value={ledger}>{children}</LedgerContext>
}

export function useLedger() {
  const ledger = use(LedgerContext)

  if (!ledger) {
    throw new Error('useLedger outside a signed-in page')
  }

  return ledger
}
