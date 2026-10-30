import { useQueryState } from 'nuqs'
import { useState } from 'react'
import { addKindParser } from '../utils/operation-filters.utils'

/** ?add=expense|income|transfer: the global «Add» sets it, the sheet in the app layout reads it */
export const useAddParam = () => useQueryState('add', addKindParser)

/**
 * A new number each time `open` turns true. Keying an editor by it gives every opening a fresh form and fresh ids
 * (a double click or a retry within one opening still hits the same id), while the sheet keeps its exit animation.
 */
export function useOpenSession(open: boolean) {
  const [session, setSession] = useState(0)
  const [wasOpen, setWasOpen] = useState(false)

  if (open !== wasOpen) {
    setWasOpen(open)

    if (open) {
      setSession(session + 1)
    }
  }

  return session
}
