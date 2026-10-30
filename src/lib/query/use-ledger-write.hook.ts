import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { notify } from '@/components/ui/toaster.component'
import { useLedger } from '@/contexts/ledger.context'
import { getBrowserSupabase } from '@/lib/supabase/browser-client'
import { toPgError } from '@/lib/supabase/pg-error.utils'
import type { SaldoClient } from '@/types/supabase.types'
import { invalidateMoney } from './invalidate-money.utils'

/**
 * One write of a feature as a mutation: runs in the sequential offline-first queue (architecture §6), refetches this
 * space's money views when it settles, and turns a Postgres error into the errors.db.<kind> toast. The caller adds
 * onSuccess (close the sheet, «Saved» toast) per call.
 */
export function useLedgerWrite<Input>(write: (supabase: SaldoClient, input: Input) => Promise<unknown>) {
  const queryClient = useQueryClient()
  const { ledgerId } = useLedger()
  const translate = useTranslations('errors')

  return useMutation({
    mutationFn: (input: Input) => write(getBrowserSupabase(), input),
    scope: { id: 'writes' },
    networkMode: 'offlineFirst',
    onError: (error) => notify.error(translate(`db.${toPgError(error as { code?: string }).kind}`)),
    onSettled: () => invalidateMoney(queryClient, ledgerId),
  })
}
