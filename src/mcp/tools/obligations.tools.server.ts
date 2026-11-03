import 'server-only'
import type { McpServer } from '@modelcontextprotocol/server'
import { addDays, format, parseISO } from 'date-fns'
import { z } from 'zod'
import { CURRENCIES } from '@/constants/currencies.constants'
import { createObligation, listObligations, payObligation } from '@/features/obligations/api/obligations.api'
import { createObligationInputSchema } from '@/features/obligations/schemas/obligation-input.schema'
import { payObligationInputSchema } from '@/features/obligations/schemas/pay-obligation-input.schema'
import { toPgError } from '@/lib/supabase/pg-error.utils'
import { toOccurredAt } from '@/lib/utils/clock.utils'
import { registerReadTool, registerWriteTool } from '../register-tool.server'
import type { ToolContext } from '../tool-context.server'
import { ledgerIdField } from '../tool-input.schema'
import { ToolError, toPreview } from '../tool-result.utils'
import { assertWriter, findAccount } from '../write-checks.server'

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

const confirmField = z.boolean().default(false).describe('false (default) only previews; true writes')

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
  id: z
    .uuid()
    .optional()
    .describe('Idempotency key. The preview returns one: send it back with confirm true; a repeat adds nothing.'),
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

function registerMarkPaid(server: McpServer) {
  registerWriteTool(
    server,
    'mark_paid',
    {
      title: 'Mark a planned payment paid',
      description:
        'Confirms a planned payment from list_upcoming: links an operation already recorded (preferred, nothing new is added) or records a new one, through the same pay_obligation as the app. Without confirm true it only returns a preview.',
      inputSchema: markPaidInput,
    },
    async (args, context) => {
      assertWriter(context)

      const paymentId = args.payment_id ?? crypto.randomUUID()
      const input = await toPayInput(args, paymentId, context)

      if (!args.confirm) {
        return {
          preview: true,
          data: toPreview('mark_paid', input, {
            ...args,
            payment_id: paymentId,
          }),
        }
      }

      await payObligation(context.supabase, input)

      return {
        data: { written: input },
        createdIds: [paymentId, ...(input.newOperation ? [input.newOperation.id] : [])],
      }
    },
  )
}

function registerCreatePlanned(server: McpServer) {
  registerWriteTool(
    server,
    'create_planned_payment',
    {
      title: 'Plan a one-off payment',
      description:
        'Adds a one-off planned payment or expected income (a plan, not a fact). Subscriptions and credits are made in the app. Without confirm true it only returns a preview.',
      inputSchema: plannedInput,
    },
    async (args, context) => {
      assertWriter(context)

      const id = args.id ?? crypto.randomUUID()
      const input = toObligationInput(args, id, context)

      if (!args.confirm) {
        return {
          preview: true,
          data: toPreview('create_planned_payment', input, {
            ...args,
            id,
          }),
        }
      }

      await createOnce(context, input)

      return {
        data: { written: input },
        createdIds: [id],
      }
    },
  )
}

/** mark_paid and create_planned_payment (plan 10.8) */
export function registerObligationsWriteTools(server: McpServer) {
  registerMarkPaid(server)
  registerCreatePlanned(server)
}
