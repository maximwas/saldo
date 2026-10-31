import { Suspense } from 'react'
import { Bone, SkeletonCard } from '@/components/ui/skeleton.component'
import { getMembers, getPendingInvites } from '@/features/ledgers/api/access.server'
import { AccessScreen } from '@/features/ledgers/components/access-screen.component'
import { getActiveLedger, verifySession } from '@/lib/auth/dal.server'

// the row widths of the Figma skeleton 2:46735: name and email bars
const SKELETON_ROWS = [
  ['w-55', 'w-40'],
  ['w-45', 'w-60'],
  ['w-50', 'w-35'],
] as const

export default function AccessPage() {
  return (
    <Suspense fallback={<AccessSkeleton />}>
      <Access />
    </Suspense>
  )
}

// Figma «Saldo» → Settings · Loading 2:46524: one card, padding 24, gap 20: title bar 160x20, three rows of a 40 circle,
// two bars (16 and 12 high, gap 8) and the role field 200x44
function AccessSkeleton() {
  return (
    <SkeletonCard aria-busy className="gap-5 p-5 lg:p-6">
      <Bone className="h-5 w-40 rounded-sm" />
      {SKELETON_ROWS.map(([name, email]) => (
        <div key={name} className="flex items-center gap-4">
          <Bone className="size-10 rounded-full" />
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <Bone className={`h-4 max-w-full rounded-xs ${name}`} />
            <Bone className={`h-3 max-w-full rounded-xs ${email}`} />
          </div>
          <Bone className="hidden h-11 w-50 rounded-md sm:block" />
        </div>
      ))}
    </SkeletonCard>
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
