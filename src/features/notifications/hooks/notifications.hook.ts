import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useClock } from '@/contexts/clock.context'
import { useLedgerWrite, type WriteCallbacks } from '@/lib/query/ledger-write.hook'
import { defineWrites, type LedgerWrite } from '@/lib/query/ledger-writes.mutations'
import { clearReadNotifications, markNotificationsRead } from '../api/notifications.api'
import { notificationQueries } from '../api/notifications.queries'

/** this feature's writes in the device's queue; AppProviders registers them before the cache is restored */
export const notificationsWrites = defineWrites('notifications', {
  markNotificationsRead,
  clearReadNotifications,
})

export const useNotifications = () => useQuery(notificationQueries.list())

/** unread count for the bell: the same cached list the centre shows */
export function useUnreadCount() {
  return useQuery({
    ...notificationQueries.list(),
    select: (items) => items.filter((item) => !item.readAt).length,
  }).data
}

// the queue refetches money views only: a notification write refetches the list itself
function useNotificationWrite<Input>(write: LedgerWrite<Input>) {
  const queryClient = useQueryClient()
  const ledgerWrite = useLedgerWrite(write)
  const mutate = (input: Input, callbacks: WriteCallbacks = {}) =>
    ledgerWrite.mutate(input, {
      ...callbacks,
      onSettled: () => {
        void queryClient.invalidateQueries({ queryKey: notificationQueries.all })
        callbacks.onSettled?.()
      },
    })

  return {
    ...ledgerWrite,
    mutate,
  }
}

/** ids = undefined marks all unread ones */
export function useMarkRead() {
  const { now } = useClock()
  const write = useNotificationWrite(notificationsWrites.markNotificationsRead)

  return {
    ...write,
    mutate: (ids: string[] | undefined) =>
      write.mutate({
        ids,
        readAt: now().toISOString(),
      }),
  }
}

export const useClearRead = () => useNotificationWrite(notificationsWrites.clearReadNotifications)
