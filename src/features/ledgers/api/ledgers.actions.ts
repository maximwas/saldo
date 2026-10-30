'use server'

import { cookies } from 'next/headers'
import { z } from 'zod'
import { LEDGER_COOKIE, verifySession } from '@/lib/auth/dal.server'
import { logger } from '@/lib/logger/logger.server'
import { logPgError } from '@/lib/supabase/pg-error.server'
import { getServerSupabase } from '@/lib/supabase/server-client'

const log = logger.child({
  module: 'ledgers',
})

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365

// Setting the cookie inside a Server Action makes Next re-render the page with the new space
export async function switchLedger(rawLedgerId: string) {
  const ledgerId = z.uuid().parse(rawLedgerId)
  const session = await verifySession()
  const supabase = await getServerSupabase()
  const { data: membership, error } = await supabase
    .from('ledger_members')
    .select('ledger_id')
    .eq('ledger_id', ledgerId)
    .eq('user_id', session.userId)
    .maybeSingle()

  if (error) {
    logPgError(log, error, 'membership lookup failed')

    throw new Error('Membership lookup failed')
  }

  if (!membership) {
    log.warn(
      {
        ledgerId,
        userId: session.userId,
      },
      'switch to a space without membership',
    )

    throw new Error('Not a member of this space')
  }

  const cookieStore = await cookies()

  cookieStore.set(LEDGER_COOKIE, ledgerId, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: ONE_YEAR_SECONDS,
  })

  const { error: settingsError } = await supabase
    .from('user_settings')
    .update({ last_ledger_id: ledgerId })
    .eq('user_id', session.userId)

  // the cookie already switched the space; a stale last_ledger_id only matters on another device
  if (settingsError) {
    logPgError(log, settingsError, 'last_ledger_id update failed')
  }
}
