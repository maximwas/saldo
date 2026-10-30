import { QueryClient } from '@tanstack/react-query'

// shortcut: no IndexedDB persist yet; phase 8 swaps in PersistQueryClientProvider (architecture §6)
export function makeQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { staleTime: 30_000 } } })
}
