import 'server-only'
import type { McpServer } from '@modelcontextprotocol/server'
import { getOverview } from '@/features/overview/api/overview.api'
import { registerReadTool } from '../register-tool.server'
import { spaceInput } from '../tool-input.schema'

export function registerOverviewTools(server: McpServer) {
  registerReadTool(
    server,
    'get_available_to_date',
    {
      title: 'Available until the next income',
      description:
        'The «Available» figure of the Overview screen, computed by the same code: balances of the accounts counted in Available minus the unpaid outgoing planned payments due up to untilOn (the next income date the person set; null = not set, then availableMinor is not computed). Expected incomes are listed apart and never added. Every part is in minor units of the base currency; null = unknown (a missing amount or rate), never 0.',
      inputSchema: spaceInput,
    },
    async (_args, { supabase, ledger, now }) => {
      const overview = await getOverview(supabase, {
        ledgerId: ledger.id,
        now,
        timeZone: ledger.timeZone,
      })

      return {
        data: {
          baseCurrency: overview.baseCurrency,
          today: overview.today,
          untilOn: overview.untilOn,
          available: overview.available,
        },
      }
    },
  )
}
