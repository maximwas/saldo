import { createDueNotifications, pushNotifications } from '@/features/notifications/api/reminders.server'
import { isCronAuthorized } from '@/lib/auth/cron-secret.utils'
import { env } from '@/lib/env'
import { logger } from '@/lib/logger/logger.server'
import { getAdminSupabase } from '@/lib/supabase/admin-client.server'
import { logPgError } from '@/lib/supabase/pg-error.server'

const log = logger.child({
  module: 'cron',
})

// Reminders (architecture §3.4): pg_cron → pg_net POSTs here every 10 minutes (migration reminders.sql), with the same
// Bearer CRON_SECRET as /api/cron/daily. Safe to call again at any time: nothing is created or sent twice.
export async function POST(request: Request) {
  if (!isCronAuthorized(request.headers.get('authorization'), env.CRON_SECRET)) {
    return new Response(null, { status: 401 })
  }

  const startedAt = performance.now()
  const elapsed = () => Math.round(performance.now() - startedAt)
  const admin = getAdminSupabase()
  const created = await createDueNotifications(admin, new Date())

  if (created.error) {
    logPgError(log.child({ durationMs: elapsed() }), created.error, 'cron/reminders failed: notifications')

    return Response.json({ ok: false }, { status: 500 })
  }

  const notifications = created.data ?? []
  const push = await pushNotifications(admin, notifications, log)

  if (push.error) {
    logPgError(log.child({ durationMs: elapsed() }), push.error, 'cron/reminders failed: delivery status')

    return Response.json({ ok: false }, { status: 500 })
  }

  log.info(
    {
      created: notifications.length,
      pushed: push.deliveries.filter((delivery) => delivery.status === 'sent').length,
      pushFailed: push.deliveries.filter((delivery) => delivery.status === 'failed').length,
      devicesRemoved: push.deliveries.reduce((sum, delivery) => sum + delivery.goneIds.length, 0),
      durationMs: elapsed(),
    },
    'cron/reminders finished',
  )

  return Response.json({
    ok: true,
    created: notifications.length,
  })
}
