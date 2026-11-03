import { useSyncExternalStore } from 'react'

function watch(query: string) {
  function subscribe(notify: () => void) {
    const list = window.matchMedia(query)

    list.addEventListener('change', notify)

    return () => list.removeEventListener('change', notify)
  }

  return {
    subscribe,
    matches: () => window.matchMedia(query).matches,
  }
}

// Tailwind's md and lg breakpoints
const sheetDialog = watch('(min-width: 48rem)')
const wideLayout = watch('(min-width: 64rem)')
// the server renders the wide variant
const onServer = () => true

/** md up: a Sheet is a dialog anchored at the top, below it a bottom drawer; for the Sheet and what sits inside one */
export function useIsSheetDialog() {
  return useSyncExternalStore(sheetDialog.subscribe, sheetDialog.matches, onServer)
}

/** lg up: the shell is the sidebar layout, below it the phone layout (Topbar + TabBar); for page content */
export function useIsWideLayout() {
  return useSyncExternalStore(wideLayout.subscribe, wideLayout.matches, onServer)
}
