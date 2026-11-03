import 'server-only'
import type { McpServer } from '@modelcontextprotocol/server'
import { z } from 'zod'
import { monthRange } from '@/features/overview/utils/overview.utils'
import {
  getBudget,
  getByCategory,
  getCashflow,
  getCredits,
  getForecast,
  getSubscriptions,
} from '@/features/statistics/api/statistics.api'
import { forecastRange, periodValue, resolvePeriod } from '@/features/statistics/utils/statistics-period.utils'
import { registerReadTool } from '../register-tool.server'
import type { ToolContext } from '../tool-context.server'
import { ledgerIdField, monthField } from '../tool-input.schema'

const monthInput = z.object({
  ledger_id: ledgerIdField,
  month: monthField,
})

const periodInput = z.object({
  ledger_id: ledgerIdField,
  period: z
    .string()
    .regex(/^(\d{4}(-(0[1-9]|1[0-2]))?|3m|6m|12m)$/)
    .optional()
    .describe(
      'YYYY-MM (a month), YYYY (a year), or 3m, 6m, 12m (months ending with the current one). Default: the current month.',
    ),
  member_id: z
    .uuid()
    .optional()
    .describe('«Who»: only operations this member recorded (list_members); plans and limits stay whole'),
})

type PeriodInput = z.infer<typeof periodInput>

/** the same RPCs and period rules as the Statistics screen */
async function readStatistics({ period, member_id }: PeriodInput, { supabase, ledger, today }: ToolContext) {
  const { from, to, bucket } = resolvePeriod(periodValue(period ?? null, today), today)
  const params = {
    ledgerId: ledger.id,
    from,
    to,
    bucket,
    createdBy: member_id ?? null,
  }
  const ahead = forecastRange(today)
  const [cashflow, byCategory, budget, subscriptions, credits, forecast] = await Promise.all([
    getCashflow(supabase, params),
    getByCategory(supabase, params),
    getBudget(supabase, params),
    getSubscriptions(supabase, params),
    getCredits(supabase, params),
    getForecast(supabase, {
      ledgerId: ledger.id,
      from: ahead.from,
      to: ahead.to,
    }),
  ])

  return {
    data: {
      from,
      to,
      bucket,
      cashflow,
      byCategory,
      budget,
      subscriptions,
      credits,
      forecast: {
        from: ahead.from,
        to: ahead.to,
        days: forecast,
      },
    },
  }
}

function registerGetStatistics(server: McpServer) {
  registerReadTool(
    server,
    'get_statistics',
    {
      title: 'Statistics of a period',
      description:
        'The Statistics screen for a month, a year or the last 3, 6 or 12 months: income, expense and result by bucket (cashflow), expenses by category, budget against fact, subscriptions, credits, and the forecast of the next three months from entered schedules only. Minor units of the base currency; transfers are not expenses, refunds reduce them.',
      inputSchema: periodInput,
    },
    readStatistics,
  )
}

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

  registerGetStatistics(server)
}
