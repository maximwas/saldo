'use client'

import { parseAsString, useQueryState } from 'nuqs'
import { useState } from 'react'
import { useCanWrite } from '@/contexts/ledger.context'
import { useAddParam, useOpenSession } from '../hooks/add-operation.hook'
import type { AddKind } from '../operations.types'
import { OperationEditor } from './operation-editor.component'

// The sheet behind the global «Add» (FAB on mobile, button on desktop): ?add=expense|income|transfer opens it with
// that kind, on the date of ?on=YYYY-MM-DD when given (the calendar day). Mounted once in the app layout; a viewer never
// gets it, whatever the URL says.
export function AddOperationHost() {
  const canWrite = useCanWrite()
  const [add, setAdd] = useAddParam()
  const [onDate, setOnDate] = useQueryState('on', parseAsString)
  const [lastKind, setLastKind] = useState<AddKind>('expense')
  const open = canWrite && add !== null
  const session = useOpenSession(open)

  // the sheet keeps showing the kind it had while it slides out
  if (add && add !== lastKind) {
    setLastKind(add)
  }

  if (session === 0) {
    return null
  }

  return (
    <OperationEditor
      key={session}
      open={open}
      target={{
        mode: 'create',
        kind: lastKind,
        defaults: onDate ? { occurredOn: onDate } : undefined,
      }}
      onOpenChangeAction={(next) => {
        if (!next) {
          void setAdd(null)
          void setOnDate(null)
        }
      }}
      onKindChangeAction={(kind) => void setAdd(kind)}
    />
  )
}
