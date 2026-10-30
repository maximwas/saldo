'use server'

import { z } from 'zod'
import { verifySession } from '@/lib/auth/dal.server'
import { logger } from '@/lib/logger/logger.server'
import { getAdminSupabase } from '@/lib/supabase/admin-client.server'
import { logPgError } from '@/lib/supabase/pg-error.server'
import { getServerSupabase } from '@/lib/supabase/server-client'

const log = logger.child({
  module: 'member-names',
})

type MemberNameRow = {
  user_id: string
  display_name: string | null
}

/** [userId, name]: the display name, else the email prefix, else '' */
async function memberNameEntry(
  admin: ReturnType<typeof getAdminSupabase>,
  row: MemberNameRow,
): Promise<[string, string]> {
  const name = row.display_name?.trim()

  if (name) {
    return [row.user_id, name]
  }

  const { data: user } = await admin.auth.admin.getUserById(row.user_id)

  return [row.user_id, user.user?.email?.split('@')[0] ?? '']
}

/** userId → display name of the space's members; no name set = the part of the email before «@» */
export async function listMemberNames(rawLedgerId: string): Promise<Record<string, string>> {
  const ledgerId = z.uuid().parse(rawLedgerId)

  await verifySession()

  // RLS returns the members of this space only to a member, so a stranger gets nothing, and the secret key below
  // reads emails for exactly these ids
  const supabase = await getServerSupabase()
  const { data, error } = await supabase
    .from('ledger_members')
    .select('user_id, display_name')
    .eq('ledger_id', ledgerId)

  if (error) {
    logPgError(log, error, 'member names lookup failed')

    throw new Error('Member names lookup failed')
  }

  const admin = getAdminSupabase()
  const entries = await Promise.all(data.map((row) => memberNameEntry(admin, row)))

  return Object.fromEntries(entries.filter(([, name]) => name !== ''))
}
