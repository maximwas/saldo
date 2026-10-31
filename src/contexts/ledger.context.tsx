'use client'

import { createContext, use, useMemo } from 'react'
import { useStore } from 'zustand'
import { type ActiveLedger, createLedgerStore, type LedgerStore } from '@/store/ledger.store'

// DI only: the context carries the per-request store instance, the values live in the store (src/store/ledger.store.ts).
// null on /login and other signed-out pages
const LedgerStoreContext = createContext<LedgerStore | null>(null)

type LedgerProviderProps = {
  ledger: ActiveLedger | null
  children: React.ReactNode
}

// router.refresh() hands over a fresh server value: a new store keeps the first render after it in step with it
export function LedgerProvider({ ledger, children }: LedgerProviderProps) {
  const store = useMemo(() => (ledger ? createLedgerStore(ledger) : null), [ledger])

  return <LedgerStoreContext value={store}>{children}</LedgerStoreContext>
}

/** read one value of the active space; the component re-renders only when that value changes */
export function useLedgerStore<T>(selector: (ledger: ActiveLedger) => T): T {
  const store = use(LedgerStoreContext)

  if (!store) {
    throw new Error('useLedgerStore outside a signed-in page')
  }

  return useStore(store, selector)
}

// shortcut: the whole space for hooks that read several fields; components select what they render
export function useLedger() {
  return useLedgerStore((ledger) => ledger)
}

// A viewer sees no write buttons anywhere; RLS refuses the write anyway (architecture §6)
export function useCanWrite() {
  return useLedgerStore((ledger) => ledger.role !== 'viewer')
}
