'use client'

import { Plus } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useCanWrite } from '@/contexts/ledger.context'
import { useAddParam } from '@/features/operations/hooks/add-operation.hook'

// Figma «Saldo» → FAB 2:8233: 56, primary, radius full, shadow/float; on Overview mobile 2:8735 right 20, bottom 100 (over the TabBar)
// opens the «Add» sheet through ?add= (AddOperationHost in the app layout)
// the pages that carry their own FAB (Figma 2:50745: a new category)
const OWN_FAB_PATHS = ['/operations/categories']

export function Fab() {
  const pathname = usePathname()
  const canWrite = useCanWrite()
  const translate = useTranslations('shell')
  const [, setAdd] = useAddParam()

  if (!canWrite || OWN_FAB_PATHS.includes(pathname)) {
    return null
  }

  return (
    <button
      type="button"
      aria-label={translate('add')}
      onClick={() => void setAdd('expense')}
      className="fixed right-5 bottom-25 z-40 flex size-14 items-center justify-center rounded-full bg-primary text-on-primary shadow-float outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 lg:hidden"
    >
      <Plus aria-hidden size={24} />
    </button>
  )
}
