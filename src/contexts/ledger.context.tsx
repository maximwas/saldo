'use client'

import { createContext, use } from 'react'
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
  ledgers: LedgerSummary[]
}

// null on /login and other signed-out pages
const LedgerContext = createContext<ActiveLedger | null>(null)

type LedgerProviderProps = {
  ledger: ActiveLedger | null
  children: React.ReactNode
}

export function LedgerProvider({ ledger, children }: LedgerProviderProps) {
  return <LedgerContext value={ledger}>{children}</LedgerContext>
}

export function useLedger() {
  const ledger = use(LedgerContext)

  if (!ledger) {
    throw new Error('useLedger outside a signed-in page')
  }

  return ledger
}
