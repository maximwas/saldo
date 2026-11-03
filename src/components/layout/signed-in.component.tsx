'use client'

import { redirect } from 'next/navigation'
import { useHasLedger } from '@/contexts/ledger.context'

// The shell reads the active space (useLedgerStore), which a valid token does not promise: the account deleted on
// another device, the ledger lookup failing (a reset local database). Without a space there is no signed-in page: /login.
// A client gate, not an await in the layout: the shell stays in the static prerender (cacheComponents).
export function SignedIn({ children }: { children: React.ReactNode }) {
  if (!useHasLedger()) {
    redirect('/login')
  }

  return children
}
