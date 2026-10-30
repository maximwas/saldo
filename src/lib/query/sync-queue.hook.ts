import {
  type Mutation,
  onlineManager,
  type QueryClient,
  useIsFetching,
  useMutationState,
  useQueryClient,
} from '@tanstack/react-query'
import { useSyncExternalStore } from 'react'
import { resumeWrites, WRITES_SCOPE } from './ledger-writes.mutations'
import { type RecordState, recordState, summarizeQueue } from './sync-queue.utils'

/** one write of the device's queue as the queue sheet shows it */
export type QueuedWrite = {
  id: number
  /** [feature, write], e.g. ['operations', 'create'] */
  key: readonly unknown[]
  variables: unknown
  error: unknown
  submittedAt: number
  state: RecordState
}

const isWaiting = (mutation: Mutation) =>
  mutation.options.scope?.id === WRITES_SCOPE &&
  (mutation.state.status === 'pending' || mutation.state.status === 'error')

// plain values, not the Mutation: useMutationState compares results deeply, and a Mutation keeps its identity
const toQueued = (mutation: Mutation): QueuedWrite => ({
  id: mutation.mutationId,
  key: mutation.options.mutationKey ?? [],
  variables: mutation.state.variables,
  error: mutation.state.error,
  submittedAt: mutation.state.submittedAt,
  state: recordState(mutation.state),
})

const subscribeOnline = (notify: () => void) => onlineManager.subscribe(notify)

/** navigator.onLine as TanStack sees it; the server snapshot is online */
function useOnline() {
  return useSyncExternalStore(
    subscribeOnline,
    () => onlineManager.isOnline(),
    () => true,
  )
}

/** the latest moment any cached data came from the server: «synced at 14:32», «data as of 14:32» offline */
function useLastUpdate() {
  const queryClient = useQueryClient()

  // re-renders when a fetch starts or settles, so the time follows the refetches
  useIsFetching()

  const updatedAt = Math.max(
    0,
    ...queryClient
      .getQueryCache()
      .getAll()
      .map((query) => query.state.dataUpdatedAt),
  )

  return updatedAt > 0 ? updatedAt : null
}

/** what the queue sheet can do with one write */
function writeActions(queryClient: QueryClient) {
  const cache = queryClient.getMutationCache()
  const find = (id: number) => cache.find({ predicate: (mutation) => mutation.mutationId === id })
  const discard = (id: number) => {
    const mutation = find(id)

    if (mutation) {
      cache.remove(mutation)
    }
  }

  return {
    /** an error after the network came back (or a fixed cause): the same write, same ids, once more */
    retry: (id: number) => {
      const mutation = find(id)

      mutation?.execute(mutation.state.variables).catch(() => undefined)
    },
    /** the person gives the write up: it leaves the queue and never reaches the server */
    discard,
    /** a new write instead of a conflicting one, e.g. the same change against the server's current version */
    replace: (id: number, key: readonly unknown[], variables: unknown) => {
      discard(id)
      cache
        .build(queryClient, {
          mutationKey: key,
        })
        .execute(variables)
        .catch(() => undefined)
    },
    syncNow: () => resumeWrites(queryClient),
  }
}

/** the device's write queue (§22): unsent, failed and conflicting writes in queue order, and the SyncStatus summary */
export function useSyncQueue() {
  const queryClient = useQueryClient()
  const online = useOnline()
  const updatedAt = useLastUpdate()
  const queue = useMutationState({
    filters: {
      predicate: isWaiting,
    },
    select: toQueued,
  })

  return {
    online,
    updatedAt,
    queue,
    summary: summarizeQueue(
      queue.map((write) => write.state),
      online,
    ),
    ...writeActions(queryClient),
  }
}
