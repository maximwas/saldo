import 'server-only'
import type { McpServer } from '@modelcontextprotocol/server'
import { z } from 'zod'
import { listOperations } from '@/features/operations/api/operations.api'
import { registerReadTool } from '../register-tool.server'
import { ledgerIdField } from '../tool-input.schema'
import { ToolError } from '../tool-result.utils'

const searchInput = z.object({
  ledger_id: ledgerIdField,
  from: z.iso.date().optional().describe('First day, YYYY-MM-DD; give both from and to, or neither'),
  to: z.iso.date().optional().describe('Last day, YYYY-MM-DD'),
  type: z.enum(['all', 'expense', 'income', 'transfer']).default('all'),
  account_id: z.uuid().optional(),
  category_id: z.uuid().optional(),
  text: z.string().trim().min(1).max(100).optional().describe('A piece of the payee or the note'),
  limit: z.int().min(1).max(100).default(50),
})

type SearchInput = z.infer<typeof searchInput>

function filtersOf({ from, to, type, account_id, category_id, text }: SearchInput) {
  if (Boolean(from) !== Boolean(to)) {
    throw new ToolError('invalid_input', 'Give both from and to, or neither.')
  }

  return {
    from: from ?? null,
    to: to ?? null,
    type,
    accountId: account_id ?? null,
    categoryId: category_id ?? null,
    createdBy: null,
    text: text ?? null,
  }
}

export function registerOperationsTools(server: McpServer) {
  registerReadTool(
    server,
    'search_operations',
    {
      title: 'Search operations',
      description:
        'Recorded operations (facts) of the space, newest first, filtered like the Operations screen. A transfer is two rows (transfer_out, transfer_in) and is neither an expense nor an income; a refund is not an income. Amounts are in minor units of the operation currency; baseAmountMinor null = no rate, never 0.',
      inputSchema: searchInput,
    },
    async (args, { supabase, ledger }) => {
      const { rows } = await listOperations(supabase, {
        ledgerId: ledger.id,
        filters: filtersOf(args),
      })

      return {
        data: {
          operations: rows.slice(0, args.limit),
          more: rows.length > args.limit,
        },
      }
    },
  )
}
