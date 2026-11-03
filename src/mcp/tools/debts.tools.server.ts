import 'server-only'
import type { McpServer } from '@modelcontextprotocol/server'
import { listDebts } from '@/features/debts/api/debts.api'
import { registerReadTool } from '../register-tool.server'
import { spaceInput } from '../tool-input.schema'

export function registerDebtsTools(server: McpServer) {
  registerReadTool(
    server,
    'list_debts',
    {
      title: 'Personal debts',
      description:
        "Personal debts of the space: direction out = the person owes, in = someone owes the person; principal, repaid and remaining in minor units, status open or closed. Debts are kept apart from the month's result.",
      inputSchema: spaceInput,
    },
    async (_args, { supabase, ledger }) => ({ data: { debts: await listDebts(supabase, ledger.id) } }),
  )
}
