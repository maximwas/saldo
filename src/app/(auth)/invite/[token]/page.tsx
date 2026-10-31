import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { Brand } from '@/components/layout/brand.component'
import { findInvite } from '@/features/ledgers/api/invites.server'
import { InviteCard } from '@/features/ledgers/components/invite-card.component'
import { type InviteView, inviteStatus, isInviteToken } from '@/features/ledgers/utils/invite.utils'
import { getSession } from '@/lib/auth/dal.server'

export async function generateMetadata(): Promise<Metadata> {
  const translate = await getTranslations('auth.invite')

  return { title: translate('metaTitle') }
}

// Figma «Saldo» → accept-invite section 2:47551: 2:47552 desktop (brand over a centred 480 card), 2:49212 mobile (from the
// top: padding 64/20/32); states 2:47591 already accepted, 2:47630 invalid link, 2:49335 error banner. No app shell.
export default async function InvitePage({ params }: PageProps<'/invite/[token]'>) {
  const { token } = await params
  // session first: it waits for the real request (connection()), so the lookup never runs in a prerender
  const session = await getSession()
  const record = isInviteToken(token) ? await findInvite(token) : null
  const status = inviteStatus({
    invite: record,
    session,
    now: new Date(),
  })
  // an invalid link tells nothing about the space; who accepted it never leaves the server
  const invite: InviteView | null =
    record && status !== 'expired' && status !== 'notFound'
      ? {
          ledgerId: record.ledgerId,
          ledgerName: record.ledgerName,
          role: record.role,
          email: record.email,
          inviterName: record.inviterName,
          inviterEmail: record.inviterEmail,
          expiresAt: record.expiresAt,
          acceptedAt: record.acceptedAt,
        }
      : null

  return (
    <main className="flex min-h-dvh flex-col items-center gap-6 bg-app px-5 pt-16 pb-8 md:justify-center-safe md:py-8">
      <Brand />
      <InviteCard token={token} status={status} invite={invite} sessionEmail={session?.email ?? null} />
    </main>
  )
}
