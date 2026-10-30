import { toPgError } from '@/lib/supabase/pg-error.utils'

/** §22 states of a record in the queue; «draft» is an unsaved form (src/store/drafts.store.ts) */
export type RecordState = 'pending' | 'synced' | 'error' | 'conflict'

type WriteStatus = {
  status: 'idle' | 'pending' | 'success' | 'error'
  error: unknown
}

/** a queued write's state: a PT409 answer is a conflict to decide, any other answer an error */
export function recordState({ status, error }: WriteStatus): RecordState {
  if (status === 'success') {
    return 'synced'
  }

  if (status !== 'error') {
    return 'pending'
  }

  return toPgError(error as { code?: string }).kind === 'conflict' ? 'conflict' : 'error'
}

/** the list a person sees: the server's rows plus the queued ones the server does not have yet, one row per id */
export function mergeQueued<Row extends { id: string }>(serverRows: readonly Row[], queuedRows: readonly Row[]) {
  const onServer = new Set(serverRows.map((row) => row.id))

  return [...queuedRows.filter((row) => !onServer.has(row.id)), ...serverRows]
}

export type SyncSummary = {
  state: 'synced' | 'pending' | 'offline' | 'error' | 'conflict'
  /** the records behind the state: conflicts, errors, or every unsent write */
  count: number
}

/** SyncStatus: a conflict, then an error, needs the person first; then offline; then writes on their way */
export function summarizeQueue(states: readonly RecordState[], online: boolean): SyncSummary {
  const waiting = states.filter((state) => state !== 'synced')
  const urgent = (['conflict', 'error'] as const).find((state) => waiting.includes(state))

  if (urgent) {
    return {
      state: urgent,
      count: waiting.filter((state) => state === urgent).length,
    }
  }

  if (!online) {
    return {
      state: 'offline',
      count: waiting.length,
    }
  }

  return {
    state: waiting.length > 0 ? 'pending' : 'synced',
    count: waiting.length,
  }
}
