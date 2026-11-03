import 'server-only'
import type { McpServer } from '@modelcontextprotocol/server'
import { z } from 'zod'
import { listCalendarDayTotals, listCalendarEntries, listSavedFilters } from '@/features/calendar/api/calendar.api'
import { calendarFilterSchema } from '@/features/calendar/utils/calendar-filters.utils'
import { monthRange } from '@/features/overview/utils/overview.utils'
import { registerReadTool } from '../register-tool.server'
import { ledgerIdField } from '../tool-input.schema'
import { ToolError } from '../tool-result.utils'

const calendarInput = z.object({
  ledger_id: ledgerIdField,
  from: z.iso
    .date()
    .optional()
    .describe('First day, YYYY-MM-DD; give both from and to, or neither (the current month)'),
  to: z.iso.date().optional().describe('Last day, YYYY-MM-DD'),
  filter: calendarFilterSchema
    .default({})
    .describe(
      'The Calendar screen filter, every key optional: entry fact|plan, kinds, direction in|out, states, source_types (subscription, credit, debt, manual), source_id, category_ids, account_ids, currencies, min_amount_minor, max_amount_minor, q (text). savedFilters in the answer are ready-made ones.',
    ),
})

type Range = Pick<z.infer<typeof calendarInput>, 'from' | 'to'>

function rangeOf({ from, to }: Range, today: string) {
  if (Boolean(from) !== Boolean(to)) {
    throw new ToolError('invalid_input', 'Give both from and to, or neither.')
  }

  return from && to
    ? {
        from,
        to,
      }
    : monthRange(today)
}

export function registerCalendarTools(server: McpServer) {
  registerReadTool(
    server,
    'list_calendar',
    {
      title: 'Calendar',
      description:
        "Facts (operations) and plans (what is left of planned payments) by day for a period, filtered like the Calendar screen, with each day's totals in the base currency. A paid plan shows as its fact, never twice; amountMinor null = unknown, never 0.",
      inputSchema: calendarInput,
    },
    async (args, { supabase, ledger, today }) => {
      const range = rangeOf(args, today)
      const params = {
        ledgerId: ledger.id,
        ...range,
        filter: args.filter,
      }
      const [entries, days, savedFilters] = await Promise.all([
        listCalendarEntries(supabase, params),
        listCalendarDayTotals(supabase, params),
        listSavedFilters(supabase, ledger.id),
      ])

      return {
        data: {
          ...range,
          filter: args.filter,
          entries,
          days,
          savedFilters,
        },
      }
    },
  )
}
