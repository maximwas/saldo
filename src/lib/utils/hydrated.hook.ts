import { useSyncExternalStore } from 'react'

function subscribeNever() {
  return () => undefined
}

function onClient() {
  return true
}

function onServer() {
  return false
}

/**
 * False on the server and while React hydrates the server HTML, true from the next render. A screen in a streamed
 * Suspense boundary hydrates after PersistQueryClientProvider has restored the device cache, so it renders its
 * skeleton until this is true: the first client render then matches the server's (no hydration error #418).
 */
export function useHydrated() {
  return useSyncExternalStore(subscribeNever, onClient, onServer)
}
