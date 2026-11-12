import 'server-only'
import type { McpServer } from '@modelcontextprotocol/server'
import { z } from 'zod'
import { CURRENCIES } from '@/constants/currencies.constants'
import { listCredits, replaceCreditSchedule, saveCredit } from '@/features/credits/api/credits.api'
import { CREDIT_MODES, creditFormSchema, toSaveCreditInput } from '@/features/credits/schemas/credit-form.schema'
import { toReplaceCreditScheduleInput } from '@/features/credits/schemas/early-repayment-form.schema'
import { creditProgress, payoffOf } from '@/features/credits/utils/credits.utils'
import { fromMinor } from '@/lib/money/money.utils'
import { confirmedWriteTool, registerReadTool, type WritePlan } from '../register-tool.server'
import type { ToolContext } from '../tool-context.server'
import { confirmField, dayField, ledgerIdField, newIdField, spaceInput, versionField } from '../tool-input.schema'
import { required } from '../tool-result.utils'
import { findAccount } from '../write-checks.server'

const creditIdField = z.uuid().describe('From list_credits')

async function findCredit({ supabase, ledger }: ToolContext, id: string) {
  const { credits } = await listCredits(supabase, ledger.id)

  return required(
    credits.find((item) => item.id === id),
    'No such credit in this space: list_credits lists them.',
  )
}

const creditInput = z.object({
  ledger_id: ledgerIdField,
  credit_id: creditIdField,
})

function registerGetCredit(server: McpServer) {
  registerReadTool(
    server,
    'get_credit',
    {
      title: 'Credit with its schedule',
      description:
        'One credit with its whole installment schedule (by number: due date, planned, paid, remaining, state plan|partial|unconfirmed|paid|replaced|cancelled), its progress and the early payoff the app would offer (payoff, null when nothing is left). Amounts in minor units; null = unknown.',
      inputSchema: creditInput,
    },
    async ({ credit_id }, context) => {
      const credit = await findCredit(context, credit_id)

      return {
        data: {
          credit,
          progress: creditProgress(credit),
          payoff: payoffOf(credit),
        },
      }
    },
  )
}

export function registerCreditsTools(server: McpServer) {
  registerReadTool(
    server,
    'list_credits',
    {
      title: 'Credits and installments',
      description:
        'Credits and installment plans of the space with what is left to pay and the next installment. Amounts in minor units; null = unknown, never 0.',
      inputSchema: spaceInput,
    },
    async (_args, { supabase, ledger }) => ({ data: await listCredits(supabase, ledger.id) }),
  )

  registerGetCredit(server)
}

const minorField = z.int().positive()

const createCreditInput = z.object({
  ledger_id: ledgerIdField,
  id: newIdField,
  mode: z
    .enum(CREDIT_MODES)
    .describe(
      'equal = a total split into equal monthly installments (total_minor, count, first_on); existing = a credit already running (remaining_minor, installment_minor, paid_count, first_on = the next due date); schedule = the bank schedule row by row (rows)',
    ),
  name: z.string().trim().min(1).max(200),
  lender: z.string().trim().max(200).optional(),
  currency: z.enum(CURRENCIES).optional().describe('Default: the base currency of the space'),
  account_id: z.uuid().optional().describe('The account installments are paid from'),
  purchase_price_minor: minorField.optional().describe('What the purchase cost; never an expense by itself'),
  total_minor: minorField.optional().describe('equal: the total payable'),
  count: z.int().min(1).max(360).optional().describe('equal: the number of monthly installments'),
  first_on: z.iso.date().optional().describe('equal: the first due date; existing: the next one'),
  remaining_minor: minorField.optional().describe('existing: what is left to pay'),
  installment_minor: minorField.optional().describe('existing: the regular installment'),
  paid_count: z.int().min(0).optional().describe('existing: installments paid before Saldo'),
  rows: z
    .array(
      z.object({
        due_on: z.iso.date(),
        amount_minor: minorField,
      }),
    )
    .max(360)
    .optional()
    .describe('schedule: the installments of the bank'),
  confirm: confirmField,
})

type CreateCreditInput = z.infer<typeof createCreditInput>

/** minor units → the decimal text the credit form takes, so the form's own checks run */
function creditFormValues(args: CreateCreditInput, currency: string) {
  const text = (minor: number | undefined) => (minor === undefined ? '' : fromMinor(minor, currency))

  return {
    mode: args.mode,
    name: args.name,
    lender: args.lender ?? '',
    currency,
    accountId: args.account_id ?? null,
    price: text(args.purchase_price_minor),
    total: text(args.total_minor),
    count: args.count === undefined ? '' : String(args.count),
    firstOn: args.first_on ?? '',
    remaining: text(args.remaining_minor),
    installment: text(args.installment_minor),
    paidCount: String(args.paid_count ?? 0),
    rows: (args.rows ?? []).map((row) => ({
      dueOn: row.due_on,
      amount: fromMinor(row.amount_minor, currency),
    })),
  }
}

async function planCreateCredit(args: CreateCreditInput, context: ToolContext): Promise<WritePlan> {
  const id = args.id ?? crypto.randomUUID()

  if (args.account_id) {
    await findAccount(context, args.account_id)
  }

  const values = creditFormSchema.parse(creditFormValues(args, args.currency ?? context.ledger.baseCurrency))
  const input = toSaveCreditInput(values, {
    id,
    ledgerId: context.ledger.id,
    version: null,
  })

  return {
    willWrite: input,
    replayArgs: {
      ...args,
      id,
    },
    createdIds: [id],
    write: () => saveCredit(context.supabase, input),
  }
}

const earlyInput = z.object({
  ledger_id: ledgerIdField,
  credit_id: creditIdField,
  id: newIdField,
  pay_on: dayField.describe('The payoff day, YYYY-MM-DD; default today'),
  version: versionField,
  confirm: confirmField,
})

type EarlyInput = z.infer<typeof earlyInput>

async function planEarlyRepayment(args: EarlyInput, context: ToolContext): Promise<WritePlan> {
  const credit = await findCredit(context, args.credit_id)
  const payoff = required(payoffOf(credit), 'Nothing is left to pay on this credit.')
  const id = args.id ?? crypto.randomUUID()
  const input = toReplaceCreditScheduleInput(
    { payOn: args.pay_on ?? context.today },
    {
      id,
      creditId: credit.id,
      version: credit.version,
      payoff,
    },
  )

  return {
    willWrite: input,
    replayArgs: {
      ...args,
      id,
    },
    createdIds: [id],
    version: credit.version,
    write: () => replaceCreditSchedule(context.supabase, input),
  }
}

const closeInput = z.object({
  ledger_id: ledgerIdField,
  credit_id: creditIdField,
  version: versionField,
  confirm: confirmField,
})

async function planClose(args: z.infer<typeof closeInput>, context: ToolContext): Promise<WritePlan> {
  const credit = await findCredit(context, args.credit_id)
  const input = {
    credit: {
      id: credit.id,
      ledger_id: context.ledger.id,
      version: credit.version,
      status: 'closed' as const,
    },
    installments: null,
  }

  return {
    willWrite: input,
    replayArgs: args,
    version: credit.version,
    write: () => saveCredit(context.supabase, input),
  }
}

/** the credit form, «Pay off early» and «Close» of the credit card */
export const CREDITS_WRITE_TOOLS = [
  confirmedWriteTool(
    'create_credit',
    {
      title: 'Add a credit',
      description:
        'Adds a credit or an installment plan with its schedule (equal installments, a running credit, or the bank schedule); the purchase price is not recorded as an expense.',
      inputSchema: createCreditInput,
      destructive: false,
    },
    planCreateCredit,
  ),
  confirmedWriteTool(
    'early_repay_credit',
    {
      title: 'Pay a credit off early',
      description:
        'Pays a credit off early: its unpaid installments give way to one installment of the whole rest on pay_on, paid ones stay. Then mark_paid with obligation_id = this id records the payment.',
      inputSchema: earlyInput,
      destructive: true,
    },
    planEarlyRepayment,
  ),
  confirmedWriteTool(
    'close_credit',
    {
      title: 'Close a credit',
      description:
        'Closes a credit: its unpaid installments are cancelled, paid ones and their operations stay. Nothing is deleted.',
      inputSchema: closeInput,
      destructive: true,
    },
    planClose,
  ),
]
