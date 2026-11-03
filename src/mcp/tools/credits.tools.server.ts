import 'server-only'
import type { McpServer } from '@modelcontextprotocol/server'
import { listCredits } from '@/features/credits/api/credits.api'
import { registerReadTool } from '../register-tool.server'
import { spaceInput } from '../tool-input.schema'

export function registerCreditsTools(server: McpServer) {
  registerReadTool(
    server,
    'list_credits',
    {
      title: 'Credits and installments',
      description:
        'Credits and installment plans of the space with what is left to pay and the next installment. Amounts in minor units; null = unknown, never 0.',
      inputSchema: spaceInput,
    },
    async (_args, { supabase, ledger }) => ({ data: await listCredits(supabase, ledger.id) }),
  )
}
