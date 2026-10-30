import { isCronAuthorized } from '@/lib/auth/cron-secret.utils'
import { env } from '@/lib/env'
import { logger } from '@/lib/logger/logger.server'
import { getAdminSupabase } from '@/lib/supabase/admin-client.server'
import { logPgError } from '@/lib/supabase/pg-error.server'

const log = logger.child({
  module: 'cron',
})

// Phase 0: one cheap query a day keeps the Free project from pausing; later phases add the daily jobs (architecture §7)
export async function GET(request: Request) {
  if (!isCronAuthorized(request.headers.get('authorization'), env.CRON_SECRET)) {
    return new Response(null, { status: 401 })
  }

  const startedAt = performance.now()

  log.info('cron/daily started')

  const { error } = await getAdminSupabase()
    .from('ledgers')
    .select('id', {
      head: true,
      count: 'exact',
    })
    .limit(1)

  const durationMs = Math.round(performance.now() - startedAt)

  if (error) {
    logPgError(log.child({ durationMs }), error, 'cron/daily failed: database ping')

    return Response.json({ ok: false }, { status: 500 })
  }

  log.info({ durationMs }, 'cron/daily finished')

  return Response.json({ ok: true })
}
