import 'server-only'
import type { McpServer } from '@modelcontextprotocol/server'
import { z } from 'zod'
import { monthRange } from '@/features/overview/utils/overview.utils'
import { getByCategory, getCashflow } from '@/features/statistics/api/statistics.api'
import { registerReadTool } from '../register-tool.server'
import { ledgerIdField, monthField } from '../tool-input.schema'

const monthInput = z.object({
  ledger_id: ledgerIdField,
  month: monthField,
})

export function registerStatisticsTools(server: McpServer) {
  registerReadTool(
    server,
    'get_month_statistics',
    {
      title: 'Statistics of a month',
      description:
        'Income, expense and result of one month and the expenses by category, as the Statistics screen shows them, in minor units of the base currency. Transfers are not expenses; refunds reduce expenses.',
      inputSchema: monthInput,
    },
    async ({ month }, { supabase, ledger, today }) => {
      const { from, to } = monthRange(month ? `${month}-01` : today)
      const params = {
        ledgerId: ledger.id,
        from,
        to,
        bucket: 'month' as const,
        createdBy: null,
      }
      const [cashflow, byCategory] = await Promise.all([getCashflow(supabase, params), getByCategory(supabase, params)])

      return {
        data: {
          from,
          to,
          cashflow,
          byCategory,
        },
      }
    },
  )
}
