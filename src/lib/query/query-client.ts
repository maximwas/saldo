import { onlineManager, QueryClient } from '@tanstack/react-query'

/** how long this device keeps the cache and the write queue: a phone offline for weeks still sends its writes. Under
 * 24.8 days: gcTime is a setTimeout, and a longer one overflows 32 bits and fires at once (the cache would vanish) */
export const DEVICE_CACHE_MAX_AGE = 20 * 24 * 60 * 60 * 1000

/** the persisted cache's buster: bump it when a cached query's shape or a write's input changes incompatibly (it
 * drops the device's cache and its unsent writes, so never on a migration that keeps both readable) */
export const DEVICE_CACHE_VERSION = '1'

// gcTime >= maxAge: a restored query must not be collected before it is used (TanStack persistQueryClient)
export function makeQueryClient() {
  // TanStack starts online and only listens for events afterwards: a page reloaded offline starts offline
  if (typeof navigator !== 'undefined') {
    onlineManager.setOnline(navigator.onLine)
  }

  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: DEVICE_CACHE_MAX_AGE,
      },
    },
  })
}
