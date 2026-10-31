'use client'

import { Plus } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button.component'
import { useCanWrite } from '@/contexts/ledger.context'
import { useAddParam } from '@/features/operations/hooks/add-operation.hook'

// Figma «Saldo» → Topbar 2:8195 «Add» (Primary, M, icon 20): desktop only, the mobile twin is the FAB.
// Opens the sheet through ?add=; a viewer has no button.
export function AddButton() {
  const canWrite = useCanWrite()
  const translate = useTranslations('shell')
  const [, setAdd] = useAddParam()

  if (!canWrite) {
    return null
  }

  return (
    <Button className="hidden lg:inline-flex" onClick={() => void setAdd('expense')}>
      <Plus aria-hidden size={20} />
      {translate('add')}
    </Button>
  )
}
