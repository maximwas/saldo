import 'server-only'
import type { McpServer } from '@modelcontextprotocol/server'
import { addMonths, format, parseISO } from 'date-fns'
import { z } from 'zod'
import { copyBudgetMonth, getBudgetMonth, saveLimit, setIncomePlan } from '@/features/budget/api/budget.api'
import type { SaveLimitInput, SetIncomePlanInput } from '@/features/budget/schemas/budget-input.schema'
import { CARRY_MODES } from '@/features/budget/utils/budget.utils'
import { confirmedWriteTool, registerReadTool, type WritePlan } from '../register-tool.server'
import type { ToolContext } from '../tool-context.server'
import { confirmField, ledgerIdField, monthField, newIdField, versionField } from '../tool-input.schema'
import { orNewId } from '../write-checks.server'

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

async function budgetOf({ supabase, ledger, today }: ToolContext, asked: string | undefined) {
  const month = asked ?? today.slice(0, 7)

  return {
    month,
    budget: await getBudgetMonth(supabase, {
      ledgerId: ledger.id,
      month,
    }),
  }
}

const limitArgs = z.object({
  ledger_id: ledgerIdField,
  month: monthField,
  category_id: z.uuid().describe('An expense category (list_categories)'),
  limit_minor: z.int().positive().describe('Minor units of the base currency'),
  carry_mode: z
    .enum(CARRY_MODES)
    .optional()
    .describe(
      'reset = every month starts anew; carry = what is left or overspent moves to the next month. Default: as it was, else reset',
    ),
  id: newIdField,
  month_id: newIdField,
  version: versionField,
  confirm: confirmField,
})

async function planLimit(args: z.infer<typeof limitArgs>, context: ToolContext): Promise<WritePlan> {
  const { month, budget } = await budgetOf(context, args.month)
  const fact = budget.facts.find((item) => item.kind === 'expense' && item.categoryId === args.category_id)
  const input: SaveLimitInput = {
    ledgerId: context.ledger.id,
    month,
    monthId: orNewId(budget.monthId, args.month_id),
    limitId: orNewId(fact?.limitId, args.id),
    categoryId: args.category_id,
    limitMinor: args.limit_minor,
    carryMode: args.carry_mode ?? fact?.carryMode ?? 'reset',
    expectedVersion: fact?.limitVersion ?? null,
  }

  return {
    willWrite: input,
    replayArgs: {
      ...args,
      month,
      id: input.limitId,
      month_id: input.monthId,
    },
    createdIds: [input.limitId],
    version: input.expectedVersion,
    write: () => saveLimit(context.supabase, input),
  }
}

const incomeArgs = z.object({
  ledger_id: ledgerIdField,
  month: monthField,
  income_plan_minor: z
    .int()
    .nonnegative()
    .nullable()
    .describe('Planned income of the month in minor units of the base currency; null = no plan'),
  month_id: newIdField,
  version: versionField,
  confirm: confirmField,
})

async function planIncome(args: z.infer<typeof incomeArgs>, context: ToolContext): Promise<WritePlan> {
  const { month, budget } = await budgetOf(context, args.month)
  const input: SetIncomePlanInput = {
    ledgerId: context.ledger.id,
    month,
    monthId: orNewId(budget.monthId, args.month_id),
    incomePlanMinor: args.income_plan_minor,
    expectedVersion: budget.monthVersion,
  }

  return {
    willWrite: input,
    replayArgs: {
      ...args,
      month,
      month_id: input.monthId,
    },
    version: input.expectedVersion,
    write: () => setIncomePlan(context.supabase, input),
  }
}

const copyArgs = z.object({
  ledger_id: ledgerIdField,
  month: monthField.describe('The month to copy, YYYY-MM; default the current one. It goes to the month after it.'),
  confirm: confirmField,
})

function planCopy(args: z.infer<typeof copyArgs>, context: ToolContext): WritePlan {
  const from = args.month ?? context.today.slice(0, 7)
  const input = {
    ledgerId: context.ledger.id,
    from,
    to: format(addMonths(parseISO(`${from}-01`), 1), 'yyyy-MM'),
  }

  return {
    willWrite: input,
    replayArgs: {
      ...args,
      month: from,
    },
    write: () => copyBudgetMonth(context.supabase, input),
  }
}

/** the Budget screen: a category limit, the income plan, «Copy to next month» */
export const BUDGET_WRITE_TOOLS = [
  confirmedWriteTool(
    'set_budget_limit',
    {
      title: 'Set a budget limit',
      description:
        "Sets or changes one expense category's limit for a month and whether what is left carries over; a limit is a plan, never a fact.",
      inputSchema: limitArgs,
      destructive: true,
    },
    planLimit,
  ),
  confirmedWriteTool(
    'set_income_plan',
    {
      title: 'Set the income plan',
      description: 'Sets or clears the planned income of a month.',
      inputSchema: incomeArgs,
      destructive: true,
    },
    planIncome,
  ),
  confirmedWriteTool(
    'copy_budget_month',
    {
      title: 'Copy a budget to the next month',
      description:
        'Copies the limits and income plan of a month to the next one; a limit the next month already has is kept.',
      inputSchema: copyArgs,
      destructive: false,
    },
    planCopy,
  ),
]
