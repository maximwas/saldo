import 'server-only'
import type { McpServer } from '@modelcontextprotocol/server'
import { getAccounts } from '@/features/accounts/api/accounts.api'
import { registerReadTool } from '../register-tool.server'
import { spaceInput } from '../tool-input.schema'

export function registerAccountsTools(server: McpServer) {
  registerReadTool(
    server,
    'get_balances',
    {
      title: 'Account balances',
      description:
        "Accounts of the space with their current balance in the account currency (balanceMinor) and in the base currency on today's rate (baseMinor, null when no rate is known). Archived accounts have archivedAt set.",
      inputSchema: spaceInput,
    },
    async (_args, { supabase, ledger, today }) => ({
      data: await getAccounts(supabase, {
        ledgerId: ledger.id,
        today,
      }),
    }),
  )
}
