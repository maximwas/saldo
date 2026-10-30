import { NextResponse } from 'next/server'
import { findInvite } from '@/features/ledgers/api/invites.server'
import { acceptInviteRequestSchema } from '@/features/ledgers/schemas/ledger.schema'
import { inviteStatus } from '@/features/ledgers/utils/invite.utils'
import { logger } from '@/lib/logger/logger.server'
import { getAdminSupabase } from '@/lib/supabase/admin-client.server'

const log = logger.child({
  module: 'invites',
})

const HTTP_STATUS = {
  notFound: 404,
  expired: 410,
  accepted: 410,
  otherEmail: 403,
} as const

// Sign-up is off: this is the only way to get an account, and only for the email of a valid, unused, unexpired
// invite (ADR 20). Joining the space is accept_ledger_invite, called next by the new user under their own JWT.
// shortcut: no rate limit; a token is 256 random bits and a malformed one never reaches the database. Add a Vercel
// WAF rate-limit rule on this path if it is ever hammered.
export async function POST(request: Request) {
  const parsed = acceptInviteRequestSchema.safeParse(await request.json().catch(() => null))

  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid' }, { status: 400 })
  }

  const { token, password } = parsed.data
  const invite = await findInvite(token)
  const status = inviteStatus({
    invite,
    session: null,
    now: new Date(),
  })

  if (!invite || status !== 'open') {
    const closed = status === 'open' ? 'notFound' : status

    return NextResponse.json({ error: closed }, { status: HTTP_STATUS[closed] })
  }

  const { error } = await getAdminSupabase().auth.admin.createUser({
    email: invite.email,
    password,
    email_confirm: true,
  })

  if (error?.code === 'email_exists') {
    return NextResponse.json({ error: 'accountExists' }, { status: 409 })
  }

  if (error?.code === 'weak_password') {
    return NextResponse.json({ error: 'weakPassword' }, { status: 422 })
  }

  if (error) {
    log.error({ code: error.code ?? error.name }, 'invite account creation failed')

    return NextResponse.json({ error: 'unknown' }, { status: 500 })
  }

  log.info({ ledgerId: invite.ledgerId }, 'account created from an invite')

  return NextResponse.json({ ok: true }, { status: 201 })
}
