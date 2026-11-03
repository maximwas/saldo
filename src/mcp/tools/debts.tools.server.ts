import 'server-only'
import type { McpServer } from '@modelcontextprotocol/server'
import { z } from 'zod'
import { CURRENCIES } from '@/constants/currencies.constants'
import { addDebtMovement, listDebtMovements, listDebts, saveDebt } from '@/features/debts/api/debts.api'
import { toStatusInput } from '@/features/debts/schemas/debt-edit-form.schema'
import { DEBT_ORIGINS, debtFormSchema, toCreateDebtInput } from '@/features/debts/schemas/debt-form.schema'
import { repaymentFormSchema, toRepaymentInput } from '@/features/debts/schemas/repayment-form.schema'
import { fromMinor } from '@/lib/money/money.utils'
import { confirmedWriteTool, registerReadTool, type WritePlan } from '../register-tool.server'
import type { ToolContext } from '../tool-context.server'
import { confirmField, dayField, ledgerIdField, newIdField, spaceInput, versionField } from '../tool-input.schema'
import { required } from '../tool-result.utils'
import { clockOf, findAccount, orNewId } from '../write-checks.server'

const debtIdField = z.uuid().describe('From list_debts')

async function findDebt({ supabase, ledger }: ToolContext, id: string) {
  return required(
    (await listDebts(supabase, ledger.id)).find((item) => item.id === id),
    'No such debt in this space: list_debts lists them.',
  )
}

const debtInput = z.object({
  ledger_id: ledgerIdField,
  debt_id: debtIdField,
})

function registerGetDebt(server: McpServer) {
  registerReadTool(
    server,
    'get_debt',
    {
      title: 'Debt with its movements',
      description:
        'One personal debt with its movements, oldest first: the principal and each repayment (operationId null = recorded without money moving). Amounts in minor units of the debt currency.',
      inputSchema: debtInput,
    },
    async ({ debt_id }, context) => {
      const debt = await findDebt(context, debt_id)

      return {
        data: {
          debt,
          movements: await listDebtMovements(context.supabase, debt.id),
        },
      }
    },
  )
}

export function registerDebtsTools(server: McpServer) {
  registerReadTool(
    server,
    'list_debts',
    {
      title: 'Personal debts',
      description:
        "Personal debts of the space: direction out = the person owes, in = someone owes the person; principal, repaid and remaining in minor units, status open or closed. Debts are kept apart from the month's result.",
      inputSchema: spaceInput,
    },
    async (_args, { supabase, ledger }) => ({ data: { debts: await listDebts(supabase, ledger.id) } }),
  )

  registerGetDebt(server)
}

const createDebtInput = z.object({
  ledger_id: ledgerIdField,
  id: newIdField,
  operation_id: newIdField,
  origin: z
    .enum(DEBT_ORIGINS)
    .default('new_movement')
    .describe(
      "new_movement = money moves now on account_id; existing_no_movement = an older debt, no operation; purchase_share = the other person's share of an expense (purchase_id), owed to the person",
    ),
  direction: z.enum(['owed_to_me', 'i_owe']).describe('owed_to_me = someone owes the person; i_owe = the person owes'),
  person: z.string().trim().min(1).max(80),
  reason: z.string().trim().max(200).optional(),
  amount_minor: z.int().positive(),
  currency: z.enum(CURRENCIES).optional().describe('Default: the account currency, else the base currency'),
  account_id: z.uuid().optional().describe('new_movement: the account the money moved on'),
  arisen_on: dayField,
  due_on: z.iso.date().optional(),
  purchase_id: z.uuid().optional().describe('purchase_share: the expense operation (search_operations)'),
  note: z.string().trim().max(500).optional(),
  confirm: confirmField,
})

type CreateDebtInput = z.infer<typeof createDebtInput>

type DebtMoney = {
  currency: string
  accountId: string | null
}

/** the debt form's own values, so its schema checks them as in the app */
function debtFormValues(args: CreateDebtInput, { currency, accountId }: DebtMoney, today: string) {
  return debtFormSchema.parse({
    origin: args.origin,
    direction: args.direction,
    person: args.person,
    reason: args.reason ?? '',
    amount: fromMinor(args.amount_minor, currency),
    currency,
    accountId,
    arisenOn: args.arisen_on ?? today,
    dueOn: args.due_on ?? null,
    purchaseId: args.purchase_id ?? null,
    note: args.note ?? '',
  })
}

/** the account the money moved on (if any) and the debt currency: the account's unless another is given */
async function debtMoney(args: CreateDebtInput, context: ToolContext): Promise<DebtMoney> {
  const account = args.account_id ? await findAccount(context, args.account_id) : null

  return {
    currency: args.currency ?? account?.currency ?? context.ledger.baseCurrency,
    accountId: account?.id ?? null,
  }
}

async function planCreateDebt(args: CreateDebtInput, context: ToolContext): Promise<WritePlan> {
  const id = orNewId(args.id)
  const operationId = orNewId(args.operation_id)
  const money = await debtMoney(args, context)
  const input = toCreateDebtInput(debtFormValues(args, money, context.today), clockOf(context), {
    debtId: id,
    operationId,
    ledgerId: context.ledger.id,
  })

  return {
    willWrite: input,
    replayArgs: {
      ...args,
      id,
      operation_id: operationId,
    },
    createdIds: input.operation ? [id, operationId] : [id],
    write: () => saveDebt(context.supabase, input),
  }
}

const repaymentInput = z.object({
  ledger_id: ledgerIdField,
  debt_id: debtIdField,
  id: newIdField,
  operation_id: newIdField,
  amount_minor: z.int().positive().describe('Minor units of the debt currency'),
  account_id: z
    .uuid()
    .optional()
    .describe('The account the money moved on, in the debt currency; none = recorded without money moving now'),
  occurred_on: dayField,
  confirm: confirmField,
})

type RepaymentInput = z.infer<typeof repaymentInput>

async function planRepayment(args: RepaymentInput, context: ToolContext): Promise<WritePlan> {
  const debt = await findDebt(context, args.debt_id)
  const account = args.account_id ? await findAccount(context, args.account_id) : null
  const id = args.id ?? crypto.randomUUID()
  const operationId = args.operation_id ?? crypto.randomUUID()
  const values = repaymentFormSchema.parse({
    amount: fromMinor(args.amount_minor, debt.currency),
    currency: debt.currency,
    accountId: account?.id ?? null,
    occurredOn: args.occurred_on ?? context.today,
  })
  const input = toRepaymentInput(values, clockOf(context), {
    movementId: id,
    operationId,
    ledgerId: context.ledger.id,
    debt,
  })

  return {
    willWrite: input,
    replayArgs: {
      ...args,
      id,
      operation_id: operationId,
    },
    createdIds: input.operation ? [id, operationId] : [id],
    write: () => addDebtMovement(context.supabase, input),
  }
}

const debtStatusInput = z.object({
  ledger_id: ledgerIdField,
  debt_id: debtIdField,
  status: z
    .enum(['settled', 'written_off'])
    .describe('settled = closed as repaid; written_off = closed, it will not be repaid'),
  version: versionField,
  confirm: confirmField,
})

async function planDebtStatus(args: z.infer<typeof debtStatusInput>, context: ToolContext): Promise<WritePlan> {
  const debt = await findDebt(context, args.debt_id)
  const input = toStatusInput(debt, args.status, context.ledger.id)

  return {
    willWrite: input,
    replayArgs: args,
    version: debt.version,
    write: () => saveDebt(context.supabase, input),
  }
}

/** the debt form, «Repayment» and «Close» / «Write off» of the debt card */
export const DEBTS_WRITE_TOOLS = [
  confirmedWriteTool(
    'create_debt',
    {
      title: 'Add a personal debt',
      description:
        'Adds a personal debt: money lent or borrowed now (with its operation), an older debt without one, or the other person’s share of a purchase. A debt is neither income nor expense.',
      inputSchema: createDebtInput,
      destructive: false,
    },
    planCreateDebt,
  ),
  confirmedWriteTool(
    'add_debt_repayment',
    {
      title: 'Record a debt repayment',
      description:
        'Records a full or partial repayment of a debt, with an operation on account_id when the money moves now.',
      inputSchema: repaymentInput,
      destructive: false,
    },
    planRepayment,
  ),
  confirmedWriteTool(
    'set_debt_status',
    {
      title: 'Close or write off a debt',
      description:
        'Closes a debt as settled or writes it off; its movements and operations stay. Record what was repaid first with add_debt_repayment.',
      inputSchema: debtStatusInput,
      destructive: true,
    },
    planDebtStatus,
  ),
]
