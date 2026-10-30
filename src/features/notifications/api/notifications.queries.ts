import { queryOptions } from '@tanstack/react-query'
import { getBrowserSupabase } from '@/lib/supabase/browser-client'
import { listNotifications } from './notifications.api'

// not ledger-scoped: the centre shows every space the user belongs to (Figma 2:59946, «from all your spaces»)
export const notificationQueries = {
  all: ['notifications'] as const,
  list: () =>
    queryOptions({
      queryKey: ['notifications', 'list'],
      queryFn: () => listNotifications(getBrowserSupabase()),
    }),
}
