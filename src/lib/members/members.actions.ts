'use server'

import { z } from 'zod'
import { verifySession } from '@/lib/auth/dal.server'
import { logger } from '@/lib/logger/logger.server'
import { getAdminSupabase } from '@/lib/supabase/admin-client.server'
import { logPgError } from '@/lib/supabase/pg-error.server'
import { getServerSupabase } from '@/lib/supabase/server-client'
import { avatarUrl, type MemberProfile, memberName } from './members.utils'

const log = logger.child({
  module: 'members',
})

type AdminClient = ReturnType<typeof getAdminSupabase>

type MemberRow = {
  user_id: string
  display_name: string | null
}

/** the email prefix stands in for a missing name; only the secret key reads emails */
async function memberEmail(admin: AdminClient, row: MemberRow) {
  if (row.display_name?.trim()) {
    return null
  }

  const { data } = await admin.auth.admin.getUserById(row.user_id)

  return data.user?.email ?? null
}

/** userId → photo URL of those who have a photo; user_settings is private to each person, so the secret key reads it */
async function avatarUrls(admin: AdminClient, userIds: string[]) {
  const { data, error } = await admin
    .from('user_settings')
    .select('user_id, avatar_updated_at')
    .in('user_id', userIds)
    .not('avatar_path', 'is', null)

  if (error) {
    logPgError(log, error, 'member avatars lookup failed')

    return new Map<string, string>()
  }

  return new Map(data.map((row) => [row.user_id, avatarUrl(row.user_id, row.avatar_updated_at)]))
}

/** userId → name and photo of the space's members: the display name in this space, else the start of the email */
export async function listMembers(rawLedgerId: string): Promise<Record<string, MemberProfile>> {
  const ledgerId = z.uuid().parse(rawLedgerId)

  await verifySession()

  // RLS returns the members of this space only to a member, so a stranger gets nothing, and the secret key below
  // reads emails and photos for exactly these ids
  const supabase = await getServerSupabase()
  const { data, error } = await supabase
    .from('ledger_members')
    .select('user_id, display_name')
    .eq('ledger_id', ledgerId)

  if (error) {
    logPgError(log, error, 'members lookup failed')

    throw new Error('Members lookup failed')
  }

  const admin = getAdminSupabase()
  const [emails, avatars] = await Promise.all([
    Promise.all(data.map((row) => memberEmail(admin, row))),
    avatarUrls(
      admin,
      data.map((row) => row.user_id),
    ),
  ])

  return Object.fromEntries(
    data.map((row, index) => [
      row.user_id,
      {
        name: memberName({
          name: row.display_name,
          email: emails[index] ?? null,
        }),
        avatarUrl: avatars.get(row.user_id) ?? null,
      },
    ]),
  )
}
