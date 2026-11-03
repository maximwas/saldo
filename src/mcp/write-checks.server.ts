import 'server-only'
import { listAccountOptions } from '@/lib/finance/ledger-options.api'
import type { ToolContext } from './tool-context.server'
import { ToolError } from './tool-result.utils'

/** a viewer gets a refusal before any preview; the RPCs refuse a viewer too (42501), this only says it first */
export function assertWriter({ ledger }: ToolContext) {
  if (ledger.role === 'viewer') {
    throw new ToolError('42501', `You only view the space «${ledger.name}»: Saldo writes nothing for a viewer.`)
  }
}

/** a live account of the space: the operation takes its currency */
export async function findAccount({ supabase, ledger }: ToolContext, accountId: string) {
  const account = (await listAccountOptions(supabase, ledger.id)).find((item) => item.id === accountId)

  if (!account || account.archived) {
    throw new ToolError('reference', 'No such active account in this space: get_balances lists the accounts.')
  }

  return account
}

/** the space's clock for the app's builders (toOccurredAt): its time zone and the moment of the call */
export const clockOf = ({ ledger, now }: ToolContext) => ({
  timeZone: ledger.timeZone,
  now: () => now,
})

/** a fact is never in the future (the app's factFormSchema) */
export function assertPast({ today }: ToolContext, day: string) {
  if (day > today) {
    throw new ToolError('invalid_input', `${day} is in the future: a fact is recorded once it happened.`)
  }
}

/** an optional edit field: undefined keeps what the record has, null clears it */
export function orCurrent<Value>(value: Value | undefined, current: Value): Value {
  return value === undefined ? current : value
}

/** an edit that changes nothing is refused, so a mistaken call writes nothing */
export function assertChanges(patch: Record<string, unknown>) {
  if (Object.values(patch).every((value) => value === undefined)) {
    throw new ToolError('invalid_input', 'Nothing to change: give at least one field to change.')
  }
}

/** the first id the record or the caller already has, else a new one */
export function orNewId(...ids: (string | null | undefined)[]) {
  return ids.find(Boolean) ?? crypto.randomUUID()
}
