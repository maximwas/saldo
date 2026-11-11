import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useLedgerStore } from '@/contexts/ledger.context'
import { useLedgerWrite } from '@/lib/query/ledger-write.hook'
import { defineWrites } from '@/lib/query/ledger-writes.mutations'
import { ledgerQueryKey } from '@/lib/query/query-keys.utils'
import { getBrowserSupabase } from '@/lib/supabase/browser-client'
import { useHydrated } from '@/lib/utils/hydrated.hook'
import { getMyNotifyChannels, setMyNotifyChannels } from '../api/access.api'

/** this feature's writes in the device's queue; AppProviders registers them before the cache is restored */
export const ledgersWrites = defineWrites('ledgers', {
  setMyNotifyChannels,
})

/** «Reminders of this space for me»: off = none at all, on = in the app and as push */
export function useMyNotifyChannels(userId: string) {
  const ledgerId = useLedgerStore((ledger) => ledger.ledgerId)
  const queryClient = useQueryClient()
  const queryKey = ledgerQueryKey('ledger-members', ledgerId, 'my-channels', userId)
  const channels = useQuery({
    queryKey,
    queryFn: () => getMyNotifyChannels(getBrowserSupabase(), ledgerId, userId),
  })
  const write = useLedgerWrite(ledgersWrites.setMyNotifyChannels)
  const hydrated = useHydrated()
  // the queue refetches money views only: this card refetches its own row
  const save = (enabled: boolean) =>
    write.mutate(
      {
        ledgerId,
        channels: enabled ? ['in_app', 'push'] : [],
      },
      { onSettled: () => queryClient.invalidateQueries({ queryKey }) },
    )

  return {
    enabled: hydrated && (channels.data?.length ?? 0) > 0,
    isLoading: !hydrated || channels.isPending,
    isSaving: write.isPending,
    save,
  }
}
