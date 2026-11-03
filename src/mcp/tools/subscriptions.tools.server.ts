import 'server-only'
import type { McpServer } from '@modelcontextprotocol/server'
import { listSubscriptions } from '@/features/subscriptions/api/subscriptions.api'
import { registerReadTool } from '../register-tool.server'
import { spaceInput } from '../tool-input.schema'

export function registerSubscriptionsTools(server: McpServer) {
  registerReadTool(
    server,
    'list_subscriptions',
    {
      title: 'Subscriptions',
      description:
        "Subscriptions of the space with price, period, next charge, status (active, trial, paused, cancelled) and the person's verdict. Amounts in minor units.",
      inputSchema: spaceInput,
    },
    async (_args, { supabase, ledger }) => ({ data: { subscriptions: await listSubscriptions(supabase, ledger.id) } }),
  )
}
