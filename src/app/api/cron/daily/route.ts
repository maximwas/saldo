import { isCronAuthorized } from '@/lib/auth/cron-secret.utils'
import { env } from '@/lib/env'
import { logger } from '@/lib/logger/logger.server'
import { getAdminSupabase } from '@/lib/supabase/admin-client.server'
import { logPgError } from '@/lib/supabase/pg-error.server'

const log = logger.child({
  module: 'cron',
})

const ATTACHMENTS_BUCKET = 'attachments'

// Daily jobs (architecture §7). The orphan lookup is also the one query a day that keeps the Free project from pausing.
export async function GET(request: Request) {
  if (!isCronAuthorized(request.headers.get('authorization'), env.CRON_SECRET)) {
    return new Response(null, { status: 401 })
  }

  const startedAt = performance.now()
  const elapsed = () => Math.round(performance.now() - startedAt)
  const admin = getAdminSupabase()

  log.info('cron/daily started')

  // files left without an attachments row (a deleted operation or space), at most 1000: one Storage remove call.
  // Through the Storage API only: an SQL delete on storage.objects would leave the file in the bucket.
  const { data: paths, error } = await admin.rpc('list_orphan_attachments')

  if (error) {
    logPgError(log.child({ durationMs: elapsed() }), error, 'cron/daily failed: orphan attachments lookup')

    return Response.json({ ok: false }, { status: 500 })
  }

  if (paths.length > 0) {
    const removal = await admin.storage.from(ATTACHMENTS_BUCKET).remove(paths)

    if (removal.error) {
      log.error(
        {
          err: removal.error,
          count: paths.length,
          durationMs: elapsed(),
        },
        'cron/daily failed: orphan attachments removal',
      )

      return Response.json({ ok: false }, { status: 500 })
    }
  }

  log.info(
    {
      orphansRemoved: paths.length,
      durationMs: elapsed(),
    },
    'cron/daily finished',
  )

  return Response.json({ ok: true })
}
