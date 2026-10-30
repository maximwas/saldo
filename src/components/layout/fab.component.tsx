'use client'

import { Plus } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useLedger } from '@/contexts/ledger.context'

// Figma «Saldo» → FAB 2:8233: 56, primary, radius full, shadow/float; on Overview mobile 2:8735 right 20, bottom 100 (over the TabBar)
// shortcut: opens nothing until the ?add= sheet exists (operations feature)
export function Fab() {
  const { role } = useLedger()
  const translate = useTranslations('shell')

  if (role === 'viewer') {
    return null
  }

  return (
    <button
      type="button"
      aria-label={translate('add')}
      className="fixed right-5 bottom-25 z-40 flex size-14 items-center justify-center rounded-full bg-primary text-on-primary shadow-float outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 lg:hidden"
    >
      <Plus aria-hidden size={24} />
    </button>
  )
}
