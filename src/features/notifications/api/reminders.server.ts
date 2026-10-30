import 'server-only'
import type { Logger } from 'pino'
import { reminderBody, reminderLinkPath } from '@/features/notifications/utils/reminder-text.utils'
import type { Database } from '@/types/database.types'
import type { SaldoClient } from '@/types/supabase.types'
import { type PushTarget, sendWebPush, vapidPrivateKey } from './web-push.server'

type Tables = Database['public']['Tables']
type FireRow = Database['public']['Functions']['due_reminder_fires']['Returns'][number]
// generated types drop the nulls of a `returns table`: unknown amount (§7), no custom text
type ReminderFire = Omit<FireRow, 'amount_minor' | 'custom_text'> & {
  amount_minor: number | null
  custom_text: string | null
}
type Notification = Tables['notifications']['Row']
type Subscription = PushTarget & Pick<Tables['push_subscriptions']['Row'], 'id' | 'user_id'>
type DeliveryStatus = 'sent' | 'failed' | 'no_subscription'
type Delivery = {
  id: string
  status: DeliveryStatus
  goneIds: string[]
}

const DELIVERY_STATUSES: DeliveryStatus[] = ['sent', 'failed', 'no_subscription']

function toNotification(fire: ReminderFire, pushEnabled: boolean): Tables['notifications']['Insert'] {
  return {
    user_id: fire.user_id,
    ledger_id: fire.ledger_id,
    reminder_rule_id: fire.reminder_rule_id,
    obligation_id: fire.obligation_id,
    fire_key: fire.fire_key,
    title: fire.title,
    body: reminderBody({
      locale: fire.locale,
      direction: fire.direction,
      daysBefore: fire.days_before,
      amountMinor: fire.amount_minor,
      currency: fire.currency,
      customText: fire.custom_text,
    }),
    link_path: reminderLinkPath(fire.obligation_id, fire.ledger_id),
    delivery_status: pushEnabled && fire.channels.includes('push') ? 'pending' : null,
  }
}

/**
 * Due fires → one notification per member. `on conflict (user_id, fire_key) do nothing` returns only the rows this run
 * inserted, so a repeated or overlapping cron run creates no second notification and sends no second push.
 */
export async function createDueNotifications(admin: SaldoClient, now: Date) {
  const fires = await admin.rpc('due_reminder_fires', {
    p_now: now.toISOString(),
  })

  if (fires.error || fires.data.length === 0) {
    return {
      data: [] as Notification[],
      error: fires.error,
    }
  }

  const pushEnabled = vapidPrivateKey() !== null
  const rows = (fires.data as ReminderFire[]).map((fire) => toNotification(fire, pushEnabled))

  return admin
    .from('notifications')
    .upsert(rows, {
      onConflict: 'user_id,fire_key',
      ignoreDuplicates: true,
    })
    .select()
}

async function deliver(privateJWK: string, notification: Notification, devices: Subscription[]): Promise<Delivery> {
  if (devices.length === 0) {
    return {
      id: notification.id,
      status: 'no_subscription',
      goneIds: [],
    }
  }

  const payload = {
    title: notification.title,
    body: notification.body,
    linkPath: notification.link_path,
  }
  const outcomes = await Promise.all(devices.map((device) => sendWebPush(privateJWK, device, payload)))

  return {
    id: notification.id,
    status: outcomes.includes('sent') ? 'sent' : 'failed',
    goneIds: devices.filter((_, index) => outcomes[index] === 'gone').map((device) => device.id),
  }
}

async function saveDeliveries(admin: SaldoClient, deliveries: Delivery[], goneIds: string[]) {
  const deliveredAt = new Date().toISOString()
  const statusUpdates = DELIVERY_STATUSES.map((status) => ({
    status,
    ids: deliveries.filter((delivery) => delivery.status === status).map((delivery) => delivery.id),
  })).filter((update) => update.ids.length > 0)
  const responses = await Promise.all([
    ...statusUpdates.map(({ status, ids }) =>
      admin
        .from('notifications')
        .update({
          delivery_status: status,
          delivered_at: status === 'sent' ? deliveredAt : null,
        })
        .in('id', ids),
    ),
    ...(goneIds.length > 0 ? [admin.from('push_subscriptions').delete().in('id', goneIds)] : []),
  ])

  return responses.find((response) => response.error)?.error ?? null
}

/** Web Push for the new notifications that asked for it, on every device of their member; dead devices are removed */
export async function pushNotifications(admin: SaldoClient, notifications: Notification[], log: Logger) {
  const pending = notifications.filter((notification) => notification.delivery_status === 'pending')
  const privateJWK = vapidPrivateKey()

  if (!privateJWK || pending.length === 0) {
    if (!privateJWK && notifications.length > 0) {
      log.warn('push skipped: VAPID keys are not set')
    }

    return {
      error: null,
      deliveries: [] as Delivery[],
    }
  }

  const devices = await admin
    .from('push_subscriptions')
    .select('id, user_id, endpoint, p256dh, auth')
    .in('user_id', [...new Set(pending.map((notification) => notification.user_id))])

  if (devices.error) {
    return {
      error: devices.error,
      deliveries: [] as Delivery[],
    }
  }

  const deliveries = await Promise.all(
    pending.map((notification) =>
      deliver(
        privateJWK,
        notification,
        devices.data.filter((device) => device.user_id === notification.user_id),
      ),
    ),
  )
  const goneIds = [...new Set(deliveries.flatMap((delivery) => delivery.goneIds))]

  return {
    error: await saveDeliveries(admin, deliveries, goneIds),
    deliveries,
  }
}
