'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { Card } from '@/components/ui/card.component'
import { Switch } from '@/components/ui/switch.component'
import { notify } from '@/components/ui/toaster.component'
import { useLedgerStore } from '@/contexts/ledger.context'
import { ledgerQueryKey } from '@/lib/query/query-keys.utils'
import { getBrowserSupabase } from '@/lib/supabase/browser-client'
import { toPgError } from '@/lib/supabase/pg-error.utils'
import { getMyNotifyChannels, setMyNotifyChannels } from '../api/access.api'

type MyRemindersCardProps = {
  currentUserId: string
}

// No Figma frame (plan 3.8): one Switch 2:9645 in a Card. Every member decides for themselves, viewers included:
// off = no reminders of this space at all, on = in the app and as push (where the device has it).
export function MyRemindersCard({ currentUserId }: MyRemindersCardProps) {
  const ledgerId = useLedgerStore((ledger) => ledger.ledgerId)
  const translate = useTranslations('settings.access.reminders')
  const translateError = useTranslations('errors.db')
  const queryClient = useQueryClient()
  const queryKey = ledgerQueryKey('ledger-members', ledgerId, 'my-channels', currentUserId)
  const channels = useQuery({
    queryKey,
    queryFn: () => getMyNotifyChannels(getBrowserSupabase(), ledgerId, currentUserId),
  })
  const save = useMutation({
    mutationFn: (enabled: boolean) =>
      setMyNotifyChannels(getBrowserSupabase(), ledgerId, enabled ? ['in_app', 'push'] : []),
    onError: (error) => notify.error(translateError(toPgError(error as { code?: string }).kind)),
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  })

  return (
    <Card title={translate('title')}>
      <p className="text-label text-text-secondary">{translate('hint')}</p>
      <Switch
        label={translate('label')}
        checked={(channels.data?.length ?? 0) > 0}
        disabled={channels.isPending || save.isPending}
        onCheckedChange={(enabled) => save.mutate(enabled)}
      />
    </Card>
  )
}
