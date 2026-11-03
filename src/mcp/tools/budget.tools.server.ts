import 'server-only'
import type { McpServer } from '@modelcontextprotocol/server'
import { z } from 'zod'
import { getBudgetMonth } from '@/features/budget/api/budget.api'
import { registerReadTool } from '../register-tool.server'
import { ledgerIdField, monthField } from '../tool-input.schema'

const monthInput = z.object({
  ledger_id: ledgerIdField,
  month: monthField,
})

export function registerBudgetTools(server: McpServer) {
  registerReadTool(
    server,
    'get_budget_month',
    {
      title: 'Budget of a month',
      description:
        'The budget of one month: the income plan and, per expense category, the limit and the fact (expenses minus refunds), in minor units of the base currency. A limit is a plan, the fact comes from recorded operations only.',
      inputSchema: monthInput,
    },
    async ({ month }, { supabase, ledger, today }) => {
      const chosen = month ?? today.slice(0, 7)

      return {
        data: {
          month: chosen,
          budget: await getBudgetMonth(supabase, {
            ledgerId: ledger.id,
            month: chosen,
          }),
        },
      }
    },
  )
}
