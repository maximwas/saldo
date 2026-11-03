import 'server-only'
import type { McpServer } from '@modelcontextprotocol/server'
import { addDays, format, parseISO } from 'date-fns'
import { z } from 'zod'
import { listObligations } from '@/features/obligations/api/obligations.api'
import { registerReadTool } from '../register-tool.server'
import { ledgerIdField } from '../tool-input.schema'

const upcomingInput = z.object({
  ledger_id: ledgerIdField,
  days: z
    .int()
    .min(1)
    .max(366)
    .default(31)
    .describe('How many days ahead from today. Overdue ones are always included.'),
})

export function registerObligationsTools(server: McpServer) {
  registerReadTool(
    server,
    'list_upcoming',
    {
      title: 'Upcoming payments',
      description:
        'Open planned payments and expected incomes (direction in) of every source (subscriptions, credit installments, debts, one-off plans) due within the days ahead, overdue unconfirmed ones first. remainingMinor null = the amount is unknown. A plan is not a fact: it becomes one only when marked paid.',
      inputSchema: upcomingInput,
    },
    async ({ days }, { supabase, ledger, today }) => {
      const { open } = await listObligations(supabase, {
        ledgerId: ledger.id,
        to: format(addDays(parseISO(today), days), 'yyyy-MM-dd'),
      })

      return {
        data: {
          today,
          upcoming: open,
        },
      }
    },
  )
}
