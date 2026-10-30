import type { SaldoClient } from '@/types/supabase.types'

export type AppNotification = {
  id: string
  title: string
  body: string
  linkPath: string | null
  readAt: string | null
  deliveryStatus: string | null
  createdAt: string
}

const LIST_LIMIT = 100

// Own rows of every space the user is a member of (RLS); the newest first
export async function listNotifications(supabase: SaldoClient): Promise<AppNotification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('id, title, body, link_path, read_at, delivery_status, created_at')
    .order('created_at', { ascending: false })
    .limit(LIST_LIMIT)

  if (error) {
    throw error
  }

  return data.map((row) => ({
    id: row.id,
    title: row.title,
    body: row.body,
    linkPath: row.link_path,
    readAt: row.read_at,
    deliveryStatus: row.delivery_status,
    createdAt: row.created_at,
  }))
}

// ids = undefined marks every unread one
type MarkReadInput = {
  ids?: string[]
  now: Date
}

export async function markNotificationsRead(supabase: SaldoClient, input: MarkReadInput) {
  const query = supabase.from('notifications').update({ read_at: input.now.toISOString() }).is('read_at', null)
  const { error } = await (input.ids ? query.in('id', input.ids) : query)

  if (error) {
    throw error
  }
}

export async function clearReadNotifications(supabase: SaldoClient) {
  const { error } = await supabase.from('notifications').delete().not('read_at', 'is', null)

  if (error) {
    throw error
  }
}

export type PushDevice = {
  endpoint: string
  p256dh: string
  auth: string
  userAgent: string
}

export async function savePushDevice(supabase: SaldoClient, device: PushDevice) {
  const { error } = await supabase.from('push_subscriptions').upsert(
    {
      endpoint: device.endpoint,
      p256dh: device.p256dh,
      auth: device.auth,
      user_agent: device.userAgent,
    },
    { onConflict: 'endpoint' },
  )

  if (error) {
    throw error
  }
}

export async function removePushDevice(supabase: SaldoClient, endpoint: string) {
  const { error } = await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint)

  if (error) {
    throw error
  }
}
