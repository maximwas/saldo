import 'server-only'
import type { McpServer } from '@modelcontextprotocol/server'
import { z } from 'zod'
import { CURRENCIES } from '@/constants/currencies.constants'
import { saveRate } from '@/features/currencies/api/currencies.api'
import { saveRateInputSchema } from '@/features/currencies/schemas/rate-input.schema'
import { getLedgerFx } from '@/lib/finance/ledger-fx.api'
import { confirmedWriteTool, registerReadTool, type WritePlan } from '../register-tool.server'
import type { ToolContext } from '../tool-context.server'
import { confirmField, dayField, ledgerIdField, spaceInput } from '../tool-input.schema'

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

const rateArgs = z.object({
  ledger_id: ledgerIdField,
  quote_currency: z.enum(CURRENCIES),
  rate: z.number().positive().describe('Units of quote_currency for 1 unit of the base currency (get_currencies)'),
  rate_on: dayField,
  source_name: z.string().trim().max(80).optional().describe('Where the rate comes from, e.g. a bank'),
  confirm: confirmField,
})

function planRate(args: z.infer<typeof rateArgs>, { supabase, ledger, today }: ToolContext): WritePlan {
  const input = saveRateInputSchema.parse({
    ledger_id: ledger.id,
    base_currency: ledger.baseCurrency,
    quote_currency: args.quote_currency,
    rate: args.rate,
    rate_on: args.rate_on ?? today,
    source: 'manual',
    source_name: args.source_name ?? null,
  })

  return {
    willWrite: input,
    replayArgs: args,
    write: () => saveRate(supabase, input),
  }
}

/** Settings → Currencies: a manual rate */
export const CURRENCIES_WRITE_TOOLS = [
  confirmedWriteTool(
    'save_rate',
    {
      title: 'Save an exchange rate',
      description:
        'Saves a manual exchange rate for a date (it replaces the manual rate of that day); operations already saved keep their base amounts.',
      inputSchema: rateArgs,
      destructive: true,
    },
    planRate,
  ),
]
