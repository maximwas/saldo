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
