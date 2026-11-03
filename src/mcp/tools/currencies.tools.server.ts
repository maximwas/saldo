import 'server-only'
import type { McpServer } from '@modelcontextprotocol/server'
import { getLedgerFx } from '@/lib/finance/ledger-fx.api'
import { registerReadTool } from '../register-tool.server'
import { spaceInput } from '../tool-input.schema'

/** the newest rates are enough for a chat; the full history stays in the app */
const RATES_LIMIT = 60

export function registerCurrenciesTools(server: McpServer) {
  registerReadTool(
    server,
    'get_currencies',
    {
      title: 'Currencies and rates',
      description:
        'The base currency of the space and its newest exchange rates (rate = quote units per 1 base unit, rateOn = date, source manual or reference). For an operation on a date Saldo takes the latest rate on or before it; on the same date a manual rate beats a reference one.',
      inputSchema: spaceInput,
    },
    async (_args, { supabase, ledger }) => {
      const { baseCurrency, rates } = await getLedgerFx(supabase, ledger.id)

      return {
        data: {
          baseCurrency,
          rates: rates.slice(0, RATES_LIMIT),
        },
      }
    },
  )
}
