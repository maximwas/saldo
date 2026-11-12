import 'server-only'
import type { McpServer } from '@modelcontextprotocol/server'
import { addDays, format, parseISO } from 'date-fns'
import { z } from 'zod'
import { CURRENCIES } from '@/constants/currencies.constants'
import { cancelPlanEntry } from '@/features/calendar/api/calendar.api'
import {
  createObligation,
  listObligations,
  payObligation,
  updateObligation,
} from '@/features/obligations/api/obligations.api'
import {
  createObligationInputSchema,
  updateObligationInputSchema,
} from '@/features/obligations/schemas/obligation-input.schema'
import { payObligationInputSchema } from '@/features/obligations/schemas/pay-obligation-input.schema'
import { toPgError } from '@/lib/supabase/pg-error.utils'
import { toOccurredAt } from '@/lib/utils/clock.utils'
import { confirmedWriteTool, registerReadTool, type WritePlan } from '../register-tool.server'
import type { ToolContext } from '../tool-context.server'
import { confirmField, ledgerIdField, newIdField, versionField } from '../tool-input.schema'
import { ToolError } from '../tool-result.utils'
import { findAccount, orCurrent } from '../write-checks.server'

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

const markPaidInput = z.object({
  ledger_id: ledgerIdField,
  obligation_id: z.uuid().describe('id of an open planned payment from list_upcoming'),
  payment_id: z
    .uuid()
    .optional()
    .describe('Idempotency key. The preview returns one: send it back with confirm true; a repeat pays nothing.'),
  existing_operation_id: z
    .uuid()
    .optional()
    .describe('Link an operation that is already recorded (search_operations) instead of adding a new one: preferred'),
  account_id: z.uuid().optional().describe('For a new operation; default the planned payment account'),
  amount_minor: z.int().positive().optional().describe('Minor units of the account currency; default what is left'),
  occurred_on: z.iso.date().optional().describe('Day of the new operation, YYYY-MM-DD, default today'),
  settle: z.boolean().default(false).describe('true closes the plan even if the amount is less than what is left'),
  confirm: confirmField,
})

type MarkPaidInput = z.infer<typeof markPaidInput>

async function findOpenObligation({ supabase, ledger }: ToolContext, obligationId: string) {
  const { open } = await listObligations(supabase, { ledgerId: ledger.id })
  const obligation = open.find((item) => item.id === obligationId)

  if (!obligation) {
    throw new ToolError('P0002', 'No open planned payment with this id: list_upcoming lists them.')
  }

  return obligation
}

type Obligation = Awaited<ReturnType<typeof findOpenObligation>>

async function newPaymentOperation(args: MarkPaidInput, obligation: Obligation, context: ToolContext) {
  const accountId = args.account_id ?? obligation.accountId

  if (!accountId) {
    throw new ToolError('invalid_input', 'Give account_id (the plan has no account) or existing_operation_id.')
  }

  const account = await findAccount(context, accountId)
  const occurredOn = args.occurred_on ?? context.today
  const amountMinor = args.amount_minor ?? obligation.remainingMinor

  if (amountMinor === null) {
    throw new ToolError('invalid_input', 'The planned amount is unknown: give amount_minor.')
  }

  return {
    id: crypto.randomUUID(),
    ledger_id: context.ledger.id,
    kind: obligation.direction === 'in' ? ('income' as const) : ('expense' as const),
    direction: obligation.direction,
    account_id: account.id,
    amount_minor: amountMinor,
    currency: account.currency,
    occurred_at: toOccurredAt(occurredOn, {
      timeZone: context.ledger.timeZone,
      now: () => context.now,
    }),
    occurred_on: occurredOn,
    category_id: obligation.categoryId,
    counterparty: null,
    note: null,
  }
}

async function toPayInput(args: MarkPaidInput, paymentId: string, context: ToolContext) {
  const obligation = await findOpenObligation(context, args.obligation_id)
  const newOperation = args.existing_operation_id ? null : await newPaymentOperation(args, obligation, context)
  const amountMinor = newOperation?.amount_minor ?? args.amount_minor

  if (!amountMinor) {
    throw new ToolError('invalid_input', 'Give amount_minor: the part of the linked operation that pays this plan.')
  }

  return payObligationInputSchema.parse({
    paymentId,
    obligationId: obligation.id,
    expectedVersion: obligation.version,
    amountMinor,
    newOperation,
    existingOperationId: args.existing_operation_id ?? null,
    settle: args.settle,
  })
}

const plannedInput = z.object({
  ledger_id: ledgerIdField,
  id: newIdField,
  title: z.string().trim().min(1).max(200),
  direction: z.enum(['out', 'in']).default('out').describe('out = a payment to make, in = an expected income'),
  planned_amount_minor: z.int().positive().nullable().describe('Minor units; null = the amount is not known yet'),
  currency: z.enum(CURRENCIES).optional().describe('Default: the base currency of the space'),
  due_on: z.iso.date().describe('YYYY-MM-DD'),
  account_id: z.uuid().optional(),
  category_id: z.uuid().optional(),
  confirm: confirmField,
})

type PlannedInput = z.infer<typeof plannedInput>

const toObligationInput = (args: PlannedInput, id: string, { ledger }: ToolContext) =>
  createObligationInputSchema.parse({
    id,
    ledger_id: ledger.id,
    source_type: 'manual',
    title: args.title,
    direction: args.direction,
    planned_amount_minor: args.planned_amount_minor,
    currency: args.currency ?? ledger.baseCurrency,
    due_on: args.due_on,
    occurrence_on: args.due_on,
    account_id: args.account_id ?? null,
    category_id: args.category_id ?? null,
  })

/** obligations has no on-conflict RPC: a repeat with the same id hits its primary key, which means it is already there */
async function createOnce(context: ToolContext, input: ReturnType<typeof toObligationInput>) {
  try {
    await createObligation(context.supabase, input)
  } catch (error) {
    const { kind, constraint } = toPgError(
      error as {
        code?: string
        message?: string
      },
    )

    if (kind !== 'duplicate' || constraint !== 'obligations_pkey') {
      throw error
    }
  }
}

/** no version: pay_obligation takes the plan's version read at confirm, and a payment id it has pays nothing */
async function planMarkPaid(args: MarkPaidInput, context: ToolContext): Promise<WritePlan> {
  const paymentId = args.payment_id ?? crypto.randomUUID()
  const input = await toPayInput(args, paymentId, context)

  return {
    willWrite: input,
    replayArgs: {
      ...args,
      payment_id: paymentId,
    },
    createdIds: [paymentId, ...(input.newOperation ? [input.newOperation.id] : [])],
    write: () => payObligation(context.supabase, input),
  }
}

function planCreatePlanned(args: PlannedInput, context: ToolContext): WritePlan {
  const id = args.id ?? crypto.randomUUID()
  const input = toObligationInput(args, id, context)

  return {
    willWrite: input,
    replayArgs: {
      ...args,
      id,
    },
    createdIds: [id],
    write: () => createOnce(context, input),
  }
}

const openObligationField = z.uuid().describe('An open planned payment from list_upcoming')

const updatePlannedArgs = z.object({
  ledger_id: ledgerIdField,
  obligation_id: openObligationField,
  title: z.string().trim().min(1).max(200).optional(),
  direction: z.enum(['out', 'in']).optional(),
  planned_amount_minor: z.int().positive().nullable().optional().describe('null = the amount is not known'),
  currency: z.enum(CURRENCIES).optional(),
  due_on: z.iso.date().optional(),
  account_id: z.uuid().nullable().optional(),
  category_id: z.uuid().nullable().optional(),
  version: versionField,
  confirm: confirmField,
})

type UpdatePlannedArgs = z.infer<typeof updatePlannedArgs>

async function planUpdatePlanned(args: UpdatePlannedArgs, context: ToolContext): Promise<WritePlan> {
  const obligation = await findOpenObligation(context, args.obligation_id)

  if (obligation.sourceType !== 'manual') {
    throw new ToolError(
      'invalid_input',
      'A payment of a subscription, credit or debt follows its source: change the source, or drop this one date with cancel_planned_payment.',
    )
  }

  const input = updateObligationInputSchema.parse({
    id: obligation.id,
    ledger_id: context.ledger.id,
    expectedVersion: obligation.version,
    title: args.title ?? obligation.title,
    direction: args.direction ?? obligation.direction,
    planned_amount_minor: orCurrent(args.planned_amount_minor, obligation.plannedMinor),
    currency: args.currency ?? obligation.currency,
    due_on: args.due_on ?? obligation.dueOn,
    account_id: orCurrent(args.account_id, obligation.accountId),
    category_id: orCurrent(args.category_id, obligation.categoryId),
  })

  return {
    willWrite: input,
    replayArgs: args,
    version: obligation.version,
    write: () => updateObligation(context.supabase, input),
  }
}

const cancelPlannedArgs = z.object({
  ledger_id: ledgerIdField,
  obligation_id: openObligationField,
  version: versionField,
  confirm: confirmField,
})

async function planCancelPlanned(args: z.infer<typeof cancelPlannedArgs>, context: ToolContext): Promise<WritePlan> {
  const obligation = await findOpenObligation(context, args.obligation_id)

  if (obligation.paidMinor > 0) {
    throw new ToolError('invalid_input', 'Part of it is paid already: only a plan with nothing paid is removed.')
  }

  const input = {
    ledgerId: context.ledger.id,
    obligationId: obligation.id,
  }

  return {
    willWrite: {
      ...input,
      title: obligation.title,
      dueOn: obligation.dueOn,
    },
    replayArgs: args,
    version: obligation.version,
    write: () => cancelPlanEntry(context.supabase, input),
  }
}

/** the planned payment form and «Remove the entry» of the calendar */
export const OBLIGATIONS_WRITE_TOOLS = [
  confirmedWriteTool(
    'mark_paid',
    {
      title: 'Mark a planned payment paid',
      description:
        'Confirms a planned payment from list_upcoming: links an operation already recorded (preferred, nothing new is added) or records a new one, through the same pay_obligation as the app.',
      inputSchema: markPaidInput,
      destructive: false,
    },
    planMarkPaid,
  ),
  confirmedWriteTool(
    'create_planned_payment',
    {
      title: 'Plan a one-off payment',
      description:
        'Adds a one-off planned payment or expected income (a plan, not a fact); a subscription is create_subscription, a credit create_credit.',
      inputSchema: plannedInput,
      destructive: false,
    },
    planCreatePlanned,
  ),
  confirmedWriteTool(
    'update_planned_payment',
    {
      title: 'Change a planned payment',
      description:
        'Changes the title, amount, currency, due date, account or category of an open one-off planned payment or expected income.',
      inputSchema: updatePlannedArgs,
      destructive: true,
    },
    planUpdatePlanned,
  ),
  confirmedWriteTool(
    'cancel_planned_payment',
    {
      title: 'Remove a planned payment',
      description:
        'Removes one planned date with nothing paid from the calendar, upcoming payments and available money; its subscription, credit or series stays.',
      inputSchema: cancelPlannedArgs,
      destructive: true,
    },
    planCancelPlanned,
  ),
]
