import type { ActiveLedger } from '@/contexts/ledger.context'
import type { LedgerRole } from '@/types/supabase.types'

const DEFAULT_TIME_ZONE = 'Europe/Kyiv'

/** a ledger_members row with its space */
export type MembershipRow = {
  ledger_id: string
  role: string
  ledgers: {
    name: string
    time_zone: string
  } | null
}

/** the first preferred space the user is a member of, else the own one, else any */
export function pickMembership(
  rows: readonly MembershipRow[],
  preferredIds: readonly (string | null | undefined)[],
): MembershipRow | undefined {
  const preferred = preferredIds.map((ledgerId) => rows.find((row) => row.ledger_id === ledgerId)).find(Boolean)

  return preferred ?? rows.find((row) => row.role === 'owner') ?? rows[0]
}

/** the active space and the switcher list */
export function toActiveLedger(membership: MembershipRow, rows: readonly MembershipRow[]): ActiveLedger {
  return {
    ledgerId: membership.ledger_id,
    role: membership.role as LedgerRole,
    timeZone: membership.ledgers?.time_zone ?? DEFAULT_TIME_ZONE,
    ledgers: rows.map((row) => ({
      id: row.ledger_id,
      name: row.ledgers?.name ?? '',
      role: row.role as LedgerRole,
    })),
  }
}
