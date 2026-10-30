'use client'

import type { Route } from 'next'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useEffect } from 'react'
import { useLedger } from '@/contexts/ledger.context'
import { switchLedger } from '@/features/ledgers/api/ledgers.actions'

// A notification link carries `?ledger=<id>` (/payments?pay=…&ledger=…): the space it belongs to. Opening it from a
// push or the centre switches to that space when the person is a member, then drops the parameter from the URL.
export function LedgerLinkSwitch() {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const { ledgerId, ledgers } = useLedger()
  const target = params.get('ledger')

  useEffect(() => {
    if (!target) {
      return
    }

    const rest = new URLSearchParams(params)

    rest.delete('ledger')

    const clean = `${pathname}${rest.size > 0 ? `?${rest}` : ''}` as Route
    const member = target !== ledgerId && ledgers.some((space) => space.id === target)

    // a stranger's id only loses the parameter; a member's space is switched first, so the page loads in it
    void (member ? switchLedger(target) : Promise.resolve()).then(() => router.replace(clean))
  }, [target, ledgerId, ledgers, params, pathname, router])

  return null
}
