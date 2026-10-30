import { Suspense } from 'react'
import { getMembers, getPendingInvites } from '@/features/ledgers/api/access.server'
import { AccessScreen } from '@/features/ledgers/components/access-screen.component'
import { getActiveLedger, verifySession } from '@/lib/auth/dal.server'

export default function AccessPage() {
  return (
    <Suspense>
      <Access />
    </Suspense>
  )
}

// Members, emails and invites are request data (RLS under the person's session): read inside <Suspense>
async function Access() {
  const [session, ledger] = await Promise.all([verifySession(), getActiveLedger()])

  if (!ledger) {
    return null
  }

  const [members, invites] = await Promise.all([
    getMembers(ledger.ledgerId),
    ledger.role === 'owner' ? getPendingInvites(ledger.ledgerId, new Date()) : [],
  ])

  return <AccessScreen currentUserId={session.userId} members={members} invites={invites} />
}
