import { isCronAuthorized } from '@/lib/auth/cron-secret.utils'
import { env } from '@/lib/env'
import { getAdminSupabase } from '@/lib/supabase/admin-client.server'

// Phase 0: one cheap query a day keeps the Free project from pausing; later phases add the daily jobs (architecture §7)
export async function GET(request: Request) {
  if (!isCronAuthorized(request.headers.get('authorization'), env.CRON_SECRET)) {
    return new Response(null, { status: 401 })
  }

  const { error } = await getAdminSupabase()
    .from('ledgers')
    .select('id', {
      head: true,
      count: 'exact',
    })
    .limit(1)

  if (error) {
    console.error('cron/daily: database ping failed', error.code)

    return Response.json({ ok: false }, { status: 500 })
  }

  return Response.json({ ok: true })
}
