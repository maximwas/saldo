import { useQuery } from '@tanstack/react-query'
import { useLedger } from '@/contexts/ledger.context'
import { ledgerQueryKey } from '@/lib/query/query-keys.utils'
import { listMemberNames } from './member-names.actions'

/** names of the space's members by user id; empty while loading or offline, so callers fall back to no avatar */
export function useMemberNames() {
  const { ledgerId } = useLedger()
  const query = useQuery({
    queryKey: ledgerQueryKey('members', ledgerId, 'names'),
    queryFn: () => listMemberNames(ledgerId),
    staleTime: 5 * 60_000,
  })

  return query.data ?? {}
}
