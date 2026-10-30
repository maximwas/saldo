import type { Mutation, QueryClient } from '@tanstack/react-query'
import { isMoneyQuery } from '@/constants/query-roots.constants'
import { getBrowserSupabase } from '@/lib/supabase/browser-client'
import type { SaldoClient } from '@/types/supabase.types'

type Write<Input> = (supabase: SaldoClient, input: Input) => Promise<unknown>

/** one write of a feature: `key` names it in the queue, so a write restored after a reload finds `run` again */
export type LedgerWrite<Input> = {
  key: readonly [string, string]
  run: Write<Input>
}

type WritesOf<Writes extends Record<string, Write<never>>> = {
  [Name in keyof Writes]: LedgerWrite<Parameters<Writes[Name]>[1]>
}

/** every write of the space runs in this one sequential queue: a create reaches the server before an edit of it */
export const WRITES_SCOPE = 'writes'

/** `defineWrites('accounts', { create: createAccount })` → `{ create: { key: ['accounts', 'create'], run } }` */
export function defineWrites<Writes extends Record<string, Write<never>>>(feature: string, writes: Writes) {
  return Object.fromEntries(
    Object.entries(writes).map(([name, run]) => [
      name,
      {
        key: [feature, name],
        run,
      },
    ]),
  ) as unknown as WritesOf<Writes>
}

// a failed fetch: supabase-js gives a PostgREST error with an empty code, Auth and Storage their own names, fetch a TypeError
const TRANSIENT_NAMES = new Set(['TypeError', 'AuthRetryableFetchError', 'StorageUnknownError'])

type ErrorShape = {
  code?: unknown
  name?: unknown
}

/** only a network failure is retried: a Postgres answer (PT409, 42501, 23514 …) waits for the person */
function isTransientError(error: unknown) {
  const { code, name } = (error ?? {}) as ErrorShape

  return code === '' || TRANSIENT_NAMES.has(String(name))
}

/** Registered before the persisted cache is restored, so a write restored after a reload knows its mutationFn. The first
 * try runs even offline (offlineFirst); a network failure pauses it until the device is online; every money view
 * refetches before the write counts as synced (architecture §6) */
export function registerWrites(queryClient: QueryClient, writes: Record<string, LedgerWrite<never>>) {
  for (const write of Object.values(writes)) {
    queryClient.setMutationDefaults(write.key, {
      mutationFn: (input) => write.run(getBrowserSupabase(), input as never),
      scope: {
        id: WRITES_SCOPE,
      },
      networkMode: 'offlineFirst',
      retry: (_failureCount, error) => isTransientError(error),
      onSettled: () => queryClient.invalidateQueries({ predicate: isMoneyQuery }),
    })
  }
}

const isQueued = (mutation: Mutation) => mutation.options.scope?.id === WRITES_SCOPE

/** what the device keeps across reloads: unsent writes and the failed ones still waiting for a decision */
export const shouldPersistWrite = (mutation: Mutation) =>
  isQueued(mutation) && (mutation.state.status === 'pending' || mutation.state.status === 'error')

/** After a restore: TanStack's resumePausedMutations skips a write that was on its way when the page closed (pending,
 * not paused), so every pending one continues (the scope keeps their order); then everything refetches */
export async function resumeWrites(queryClient: QueryClient) {
  const pending = queryClient
    .getMutationCache()
    .getAll()
    .filter((mutation) => mutation.state.status === 'pending')

  // not awaited: offline they wait for the network, while the restored views refetch now
  for (const mutation of pending) {
    mutation.continue().catch(() => undefined)
  }

  await queryClient.invalidateQueries()
}
