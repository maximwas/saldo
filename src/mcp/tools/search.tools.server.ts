import 'server-only'
import type { McpServer } from '@modelcontextprotocol/server'
import { z } from 'zod'
import { searchEntities } from '@/features/search/api/search.api'
import { registerReadTool } from '../register-tool.server'
import { ledgerIdField } from '../tool-input.schema'

const searchInput = z.object({
  ledger_id: ledgerIdField,
  query: z.string().trim().min(2).max(100),
})

export function registerSearchTools(server: McpServer) {
  registerReadTool(
    server,
    'search',
    {
      title: 'Search Saldo',
      description:
        'Finds accounts, categories, subscriptions, credits, debts, planned payments and operations of the space by a word, best matches first (up to 30).',
      inputSchema: searchInput,
    },
    async ({ query }, { supabase, ledger }) => ({
      data: { results: await searchEntities(supabase, ledger.id, query) },
    }),
  )
}
