import type { Logger } from 'pino'
import {
  extendSubscriptionHorizons,
  type HorizonResult,
} from '@/features/subscriptions/api/subscription-horizon.server'
import { isCronAuthorized } from '@/lib/auth/cron-secret.utils'
import { env } from '@/lib/env'
import { logger } from '@/lib/logger/logger.server'
import { getAdminSupabase } from '@/lib/supabase/admin-client.server'
import { logPgError } from '@/lib/supabase/pg-error.server'
import type { SaldoClient } from '@/types/supabase.types'

const log = logger.child({
  module: 'cron',
})

const ATTACHMENTS_BUCKET = 'attachments'

/** files left without an attachments row (a deleted operation or space), at most 1000: one Storage remove call.
 * Through the Storage API only: an SQL delete on storage.objects would leave the file in the bucket. */
async function removeOrphanAttachments(admin: SaldoClient, jobLog: Logger): Promise<number | null> {
  const { data: paths, error } = await admin.rpc('list_orphan_attachments')

  if (error) {
    logPgError(jobLog, error, 'cron/daily failed: orphan attachments lookup')

    return null
  }

  if (paths.length > 0) {
    const removal = await admin.storage.from(ATTACHMENTS_BUCKET).remove(paths)

    if (removal.error) {
      jobLog.error(
        {
          err: removal.error,
          count: paths.length,
        },
        'cron/daily failed: orphan attachments removal',
      )

      return null
    }
  }

  return paths.length
}

/** plan 2.6: subscription series 13 months ahead; null when the subscriptions could not be listed */
async function extendHorizons(admin: SaldoClient, jobLog: Logger): Promise<HorizonResult | null> {
  try {
    return await extendSubscriptionHorizons(admin, new Date(), jobLog)
  } catch (error) {
    logPgError(jobLog, error as { code?: string }, 'cron/daily failed: subscription horizon lookup')

    return null
  }
}

// Daily jobs (architecture §7), each on its own so one failing does not skip the other. The orphan lookup is also the
// one query a day that keeps the Free project from pausing.
export async function GET(request: Request) {
  if (!isCronAuthorized(request.headers.get('authorization'), env.CRON_SECRET)) {
    return new Response(null, { status: 401 })
  }

  const startedAt = performance.now()
  const admin = getAdminSupabase()

  log.info('cron/daily started')

  const [orphansRemoved, horizon] = await Promise.all([removeOrphanAttachments(admin, log), extendHorizons(admin, log)])
  const succeeded = orphansRemoved !== null && horizon !== null && horizon.failed === 0

  log[succeeded ? 'info' : 'error'](
    {
      orphansRemoved,
      horizon,
      durationMs: Math.round(performance.now() - startedAt),
    },
    succeeded ? 'cron/daily finished' : 'cron/daily finished with failures',
  )

  return Response.json({ ok: succeeded }, { status: succeeded ? 200 : 500 })
}
