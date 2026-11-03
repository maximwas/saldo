import 'server-only'
import type { McpServer } from '@modelcontextprotocol/server'
import { getCategories } from '@/features/categories/api/categories.api'
import { registerReadTool } from '../register-tool.server'
import { spaceInput } from '../tool-input.schema'

export function registerCategoriesTools(server: McpServer) {
  registerReadTool(
    server,
    'list_categories',
    {
      title: 'Categories',
      description:
        'Income and expense categories of the space with ids, names and parents: use these ids in filters, never invent one.',
      inputSchema: spaceInput,
    },
    async (_args, { supabase, ledger }) => ({ data: { categories: await getCategories(supabase, ledger.id) } }),
  )
}
