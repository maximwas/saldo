import type { UseQueryResult } from '@tanstack/react-query'
import { useEffect, useEffectEvent } from 'react'
import { notify } from '@/components/ui/toaster.component'

/**
 * The one rule for a screen's queries (Maxim, 3.11): ErrorState only when a first load failed and there is nothing to
 * show (`failedLoad`); a refresh that fails over cached data keeps the data on screen and shows one error toast with a
 * retry. Render `failedLoad` first, then the skeleton on `data === undefined`, so TypeScript narrows the data.
 */
export function useScreenQueryState(queries: readonly UseQueryResult<unknown, unknown>[], refreshFailed: string) {
  const failedLoad = queries.some((query) => query.isLoadingError)
  // the latest failed refresh: a new failure has a new time, a re-render keeps it
  const failedAt = Math.max(0, ...queries.map((query) => (query.isRefetchError ? query.errorUpdatedAt : 0)))
  const retry = () => {
    for (const query of queries) {
      if (query.isError) {
        void query.refetch()
      }
    }
  }

  // the toast reads this render's text and queries, but only a new failure time shows it again
  const showRefreshFailed = useEffectEvent(() => notify.error(refreshFailed, { onRetry: retry }))

  useEffect(() => {
    if (failedAt > 0) {
      showRefreshFailed()
    }
  }, [failedAt])

  return {
    failedLoad,
    retry,
  }
}
