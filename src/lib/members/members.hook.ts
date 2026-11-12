import { useQuery } from '@tanstack/react-query'
import { useLedger, useLedgerStore } from '@/contexts/ledger.context'
import { ledgerQueryKey } from '@/lib/query/query-keys.utils'
import { useHydrated } from '@/lib/utils/hydrated.hook'
import { listMembers } from './members.actions'
import { authorOf, type MemberProfile, memberName } from './members.utils'

const NO_MEMBERS: Record<string, MemberProfile> = {}
const NO_NAMES: Record<string, string> = {}

/** the root of every members query: a new photo or name refreshes them in all spaces */
export const MEMBERS_QUERY_ROOT = 'members'

function membersQuery(ledgerId: string) {
  return {
    queryKey: ledgerQueryKey(MEMBERS_QUERY_ROOT, ledgerId, 'profiles'),
    queryFn: () => listMembers(ledgerId),
    staleTime: 5 * 60_000,
  }
}

function namesOf(members: Record<string, MemberProfile>) {
  return Object.fromEntries(Object.entries(members).map(([userId, member]) => [userId, member.name]))
}

/** name and photo of the space's members by user id; empty while loading or offline, so callers draw no avatar */
export function useMembers() {
  const { ledgerId } = useLedger()
  const data = useQuery(membersQuery(ledgerId)).data
  // the shell reads them too: until hydration the server's «no members» is shown, not the restored device cache
  const hydrated = useHydrated()

  return (hydrated ? data : undefined) ?? NO_MEMBERS
}

/** names of the space's members by user id (one query with useMembers) */
export function useMemberNames() {
  const { ledgerId } = useLedger()
  const query = useQuery({
    ...membersQuery(ledgerId),
    select: namesOf,
  })
  const hydrated = useHydrated()

  return (hydrated ? query.data : undefined) ?? NO_NAMES
}

/** who added a record; null in a space of one or for an unknown author */
export function useAuthor(userId: string | null) {
  return authorOf(useMembers(), userId)
}

/** the signed-in person in the active space: their name there (else the start of the email), photo and email */
export function useMyProfile() {
  const userId = useLedgerStore((ledger) => ledger.userId)
  const email = useLedgerStore((ledger) => ledger.email)
  const profile = useMembers()[userId]

  return {
    name:
      profile?.name ??
      memberName({
        name: null,
        email,
      }),
    avatarUrl: profile?.avatarUrl ?? null,
    email,
  }
}
