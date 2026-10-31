import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { notify } from '@/components/ui/toaster.component'
import { useClock } from '@/contexts/clock.context'
import { getBrowserSupabase } from '@/lib/supabase/browser-client'
import { toPgError } from '@/lib/supabase/pg-error.utils'
import { clearReadNotifications, markNotificationsRead } from '../api/notifications.api'
import { notificationQueries } from '../api/notifications.queries'

export const useNotifications = () => useQuery(notificationQueries.list())

/** unread count for the bell: the same cached list the centre shows */
export function useUnreadCount() {
  return useQuery({
    ...notificationQueries.list(),
    select: (items) => items.filter((item) => !item.readAt).length,
  }).data
}

function useNotificationWrite<Input>(write: (input: Input, now: Date) => Promise<void>) {
  const queryClient = useQueryClient()
  const { now } = useClock()
  const translate = useTranslations('errors')

  return useMutation({
    mutationFn: (input: Input) => write(input, now()),
    onError: (error) => notify.error(translate(`db.${toPgError(error as { code?: string }).kind}`)),
    onSettled: () => queryClient.invalidateQueries({ queryKey: notificationQueries.all }),
  })
}

/** ids = undefined marks all unread ones */
export const useMarkRead = () =>
  useNotificationWrite((ids: string[] | undefined, now) =>
    markNotificationsRead(getBrowserSupabase(), {
      ids,
      now,
    }),
  )

export const useClearRead = () => useNotificationWrite((_: undefined) => clearReadNotifications(getBrowserSupabase()))
