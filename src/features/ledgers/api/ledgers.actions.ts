'use server'

import { cookies } from 'next/headers'
import { z } from 'zod'
import { LEDGER_COOKIE, verifySession } from '@/lib/auth/dal.server'
import { getServerSupabase } from '@/lib/supabase/server-client'

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365

// Setting the cookie inside a Server Action makes Next re-render the page with the new space
export async function switchLedger(rawLedgerId: string) {
  const ledgerId = z.uuid().parse(rawLedgerId)
  const session = await verifySession()
  const supabase = await getServerSupabase()
  const { data: membership } = await supabase
    .from('ledger_members')
    .select('ledger_id')
    .eq('ledger_id', ledgerId)
    .eq('user_id', session.userId)
    .maybeSingle()

  if (!membership) {
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
  await supabase.from('user_settings').update({ last_ledger_id: ledgerId }).eq('user_id', session.userId)
}
