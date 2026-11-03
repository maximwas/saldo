import { onlineManager, type QueryClient, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { notify } from '@/components/ui/toaster.component'
import { toPgError } from '@/lib/supabase/pg-error.utils'
import type { LedgerWrite } from './ledger-writes.mutations'

type WriteCallbacks = {
  onSuccess?: (data: unknown) => void
  onError?: (error: unknown) => void
  onSettled?: () => void
}

type WriteOptions = {
  /** the caller shows the error itself (inline in the sheet, or per call) */
  quiet?: boolean
}

// a failure the caller has seen (toast, inline error, open form) leaves the queue: the person fixes it in the form, so
// the queue keeps only what failed unseen (after a reload, a closed sheet, an offline wait)
function forgetSeenFailure(queryClient: QueryClient, key: readonly unknown[], input: unknown) {
  const cache = queryClient.getMutationCache()
  const seen = cache.findAll({
    mutationKey: key,
    predicate: (failed) => failed.state.status === 'error' && failed.state.variables === input,
  })

  for (const failed of seen) {
    cache.remove(failed)
  }
}

/**
 * One write of a feature as a mutation of the device's write queue (ledger-writes.mutations.ts). Offline the write waits
 * in the queue, so `mutate` runs the caller's onSuccess at once (the sheet closes) and `mutateAsync` resolves at once;
 * SyncStatus shows it until it is synced, and a later failure waits in the queue sheet. A Postgres error becomes the
 * errors.db.<kind> toast unless `quiet`.
 */
export function useLedgerWrite<Input>(write: LedgerWrite<Input>, { quiet = false }: WriteOptions = {}) {
  const translate = useTranslations('errors')
  const queryClient = useQueryClient()
  const mutation = useMutation<unknown, unknown, Input>({
    mutationKey: write.key,
    onError: quiet ? undefined : (error) => notify.error(translate(`db.${toPgError(error as { code?: string }).kind}`)),
  })

  const forget = (input: Input) => forgetSeenFailure(queryClient, write.key, input)

  function mutate(input: Input, callbacks: WriteCallbacks = {}) {
    if (onlineManager.isOnline()) {
      mutation.mutate(input, {
        ...callbacks,
        onError: (error) => {
          forget(input)
          callbacks.onError?.(error)
        },
      })

      return
    }

    mutation.mutate(input)
    callbacks.onSuccess?.(undefined)
    callbacks.onSettled?.()
  }

  function mutateAsync(input: Input) {
    if (onlineManager.isOnline()) {
      return mutation.mutateAsync(input).catch((error: unknown) => {
        forget(input)

        throw error
      })
    }

    mutation.mutate(input)

    return Promise.resolve(undefined)
  }

  return {
    ...mutation,
    mutate,
    mutateAsync,
  }
}
