import 'server-only'
import type { McpServer } from '@modelcontextprotocol/server'
import { z } from 'zod'
import {
  createOperation,
  createTransfer,
  getOperation,
  listOperationSources,
  listOperations,
  listRefundLinks,
  updateOperation,
} from '@/features/operations/api/operations.api'
import type { OperationRow } from '@/features/operations/operations.types'
import { factFormSchema, toCreateOperationInput } from '@/features/operations/schemas/operation-form.schema'
import { toCreateTransferInput, transferFormSchema } from '@/features/operations/schemas/transfer-form.schema'
import { updateOperationInputSchema } from '@/features/operations/schemas/update-operation-input.schema'
import { type CreateOperationInput, createOperationInputSchema } from '@/lib/finance/create-operation-input.schema'
import type { LedgerAccountOption } from '@/lib/finance/ledger-options.api'
import { fromMinor } from '@/lib/money/money.utils'
import { toOccurredAt } from '@/lib/utils/clock.utils'
import { confirmedWriteTool, registerReadTool, registerWriteTool, type WritePlan } from '../register-tool.server'
import type { ToolContext } from '../tool-context.server'
import { confirmField, dayField, ledgerIdField, newIdField } from '../tool-input.schema'
import { required, ToolError, toPreview } from '../tool-result.utils'
import { assertChanges, assertPast, assertWriter, clockOf, findAccount } from '../write-checks.server'

const searchInput = z.object({
  ledger_id: ledgerIdField,
  from: z.iso.date().optional().describe('First day, YYYY-MM-DD; give both from and to, or neither'),
  to: z.iso.date().optional().describe('Last day, YYYY-MM-DD'),
  type: z.enum(['all', 'expense', 'income', 'transfer']).default('all'),
  account_id: z.uuid().optional(),
  category_id: z.uuid().optional(),
  text: z.string().trim().min(1).max(100).optional().describe('A piece of the payee or the note'),
  limit: z.int().min(1).max(100).default(50),
})

type SearchInput = z.infer<typeof searchInput>

async function findOperation({ supabase, ledger }: ToolContext, id: string) {
  return required(
    await getOperation(supabase, ledger.id, id),
    'No such operation in this space: search_operations finds them.',
  )
}

const operationInput = z.object({
  ledger_id: ledgerIdField,
  operation_id: z.uuid().describe('From search_operations'),
})

function filtersOf({ from, to, type, account_id, category_id, text }: SearchInput) {
  if (Boolean(from) !== Boolean(to)) {
    throw new ToolError('invalid_input', 'Give both from and to, or neither.')
  }

  return {
    from: from ?? null,
    to: to ?? null,
    type,
    accountId: account_id ?? null,
    categoryId: category_id ?? null,
    createdBy: null,
    text: text ?? null,
  }
}

function registerGetOperation(server: McpServer) {
  registerReadTool(
    server,
    'get_operation',
    {
      title: 'One operation',
      description:
        'One recorded operation with the planned payments it paid (paidPlans), how much of it was refunded (refundedMinor) and, for a refund, the purchase it returns (refundOf). Amounts in minor units of the operation currency.',
      inputSchema: operationInput,
    },
    async ({ operation_id }, context) => {
      const operation = await findOperation(context, operation_id)
      const [paidPlans, refunds] = await Promise.all([
        listOperationSources(context.supabase, operation.id),
        listRefundLinks(context.supabase, context.ledger.id),
      ])

      return {
        data: {
          operation,
          paidPlans,
          refundedMinor: refunds.refundedById[operation.id] ?? 0,
          refundOf: operation.refundOfId ? (refunds.purchases[operation.refundOfId] ?? null) : null,
        },
      }
    },
  )
}

const addInput = z.object({
  ledger_id: ledgerIdField,
  id: z
    .uuid()
    .optional()
    .describe('Idempotency key. The preview returns one: send it back with confirm true; a repeat adds nothing.'),
  kind: z.enum(['expense', 'income']),
  account_id: z.uuid().describe('From get_balances; the operation takes the account currency'),
  amount_minor: z.int().positive().describe('Minor units of the account currency: 12550 = 125.50'),
  occurred_on: z.iso.date().optional().describe('YYYY-MM-DD, default today; a fact is never in the future'),
  category_id: z.uuid().optional().describe('From list_categories, of the same kind'),
  counterparty: z.string().trim().min(1).max(200).optional(),
  note: z.string().trim().min(1).max(500).optional(),
  confirm: z.boolean().default(false).describe('false (default) only previews; true writes'),
})

type AddInput = z.infer<typeof addInput>

async function toCreateInput(args: AddInput, id: string, context: ToolContext): Promise<CreateOperationInput> {
  const { ledger, now, today } = context
  const occurredOn = args.occurred_on ?? today

  if (occurredOn > today) {
    throw new ToolError('invalid_input', 'A fact is never in the future: plan it with create_planned_payment.')
  }

  const account = await findAccount(context, args.account_id)

  return createOperationInputSchema.parse({
    id,
    ledger_id: ledger.id,
    kind: args.kind,
    direction: args.kind === 'income' ? 'in' : 'out',
    account_id: account.id,
    amount_minor: args.amount_minor,
    currency: account.currency,
    occurred_at: toOccurredAt(occurredOn, {
      timeZone: ledger.timeZone,
      now: () => now,
    }),
    occurred_on: occurredOn,
    category_id: args.category_id ?? null,
    counterparty: args.counterparty ?? null,
    note: args.note ?? null,
    refund_of_id: null,
    duplicated_from_id: null,
  })
}

/** add_operation (plan 10.8): the same create_operation RPC and input schema as the form */
export function registerOperationsWriteTools(server: McpServer) {
  registerWriteTool(
    server,
    'add_operation',
    {
      title: 'Add an operation',
      description:
        'Records an expense or an income that already happened. Without confirm true it only returns a preview and writes nothing; show it to the person and call again with its confirmArguments. Transfers, refunds and adjustments are made in the app.',
      inputSchema: addInput,
    },
    async (args, context) => {
      assertWriter(context)

      const id = args.id ?? crypto.randomUUID()
      const input = await toCreateInput(args, id, context)

      if (!args.confirm) {
        return {
          preview: true,
          data: toPreview('add_operation', input, {
            ...args,
            id,
          }),
        }
      }

      await createOperation(context.supabase, input)

      return {
        data: { written: input },
        createdIds: [id],
      }
    },
  )
}

export function registerOperationsTools(server: McpServer) {
  registerReadTool(
    server,
    'search_operations',
    {
      title: 'Search operations',
      description:
        'Recorded operations (facts) of the space, newest first, filtered like the Operations screen. A transfer is two rows (transfer_out, transfer_in) and is neither an expense nor an income; a refund is not an income. Amounts are in minor units of the operation currency; baseAmountMinor null = no rate, never 0.',
      inputSchema: searchInput,
    },
    async (args, { supabase, ledger }) => {
      const { rows } = await listOperations(supabase, {
        ledgerId: ledger.id,
        filters: filtersOf(args),
      })

      return {
        data: {
          operations: rows.slice(0, args.limit),
          more: rows.length > args.limit,
        },
      }
    },
  )

  registerGetOperation(server)
}

const EDITABLE_KINDS = new Set(['expense', 'income', 'refund', 'adjustment'])
const noteField = z.string().trim().max(500)

const updateOperationArgs = z.object({
  ledger_id: ledgerIdField,
  operation_id: z.uuid().describe('From search_operations'),
  amount_minor: z.int().positive().optional(),
  account_id: z.uuid().optional().describe('Moves it to another account: it takes that account currency'),
  occurred_on: z.iso.date().optional(),
  category_id: z.uuid().nullable().optional(),
  counterparty: z.string().trim().max(200).nullable().optional(),
  note: noteField.nullable().optional(),
  confirm: confirmField,
})

type UpdateOperationArgs = z.infer<typeof updateOperationArgs>

/** only the columns that change, as the editor sends them */
async function operationPatch(args: UpdateOperationArgs, context: ToolContext) {
  const account = args.account_id ? await findAccount(context, args.account_id) : null

  if (args.occurred_on) {
    assertPast(context, args.occurred_on)
  }

  return {
    account_id: account?.id,
    currency: account?.currency,
    amount_minor: args.amount_minor,
    occurred_on: args.occurred_on,
    occurred_at: args.occurred_on ? toOccurredAt(args.occurred_on, clockOf(context)) : undefined,
    category_id: args.category_id,
    counterparty: args.counterparty,
    note: args.note,
  }
}

async function planUpdateOperation(args: UpdateOperationArgs, context: ToolContext): Promise<WritePlan> {
  const operation = await findOperation(context, args.operation_id)

  if (!EDITABLE_KINDS.has(operation.kind) || operation.transferId) {
    throw new ToolError(
      'invalid_input',
      'Only an expense, income, refund or adjustment is edited here; transfers and debt movements are changed in the app.',
    )
  }

  const patch = await operationPatch(args, context)

  assertChanges(patch)

  const input = updateOperationInputSchema.parse({
    id: operation.id,
    expectedVersion: operation.version,
    patch,
  })

  return {
    willWrite: input,
    replayArgs: args,
    write: () => updateOperation(context.supabase, input),
  }
}

const transferArgs = z.object({
  ledger_id: ledgerIdField,
  id: newIdField,
  from_account_id: z.uuid(),
  to_account_id: z.uuid(),
  amount_minor: z.int().positive().describe('Minor units leaving from_account, in its currency'),
  to_amount_minor: z
    .int()
    .positive()
    .optional()
    .describe('Minor units arriving, in the to_account currency; required when the currencies differ'),
  fee_minor: z.int().positive().optional().describe('A bank fee in the from_account currency: its own expense'),
  fee_category_id: z.uuid().optional().describe('Expense category of the fee'),
  occurred_on: dayField,
  note: noteField.optional(),
  confirm: confirmField,
})

type TransferArgs = z.infer<typeof transferArgs>

function minorText(minor: number | undefined, currency: string) {
  return minor === undefined ? '' : fromMinor(minor, currency)
}

type TransferEnds = {
  source: LedgerAccountOption
  target: LedgerAccountOption
  occurredOn: string
}

/** the transfer form's own values, so its schema checks them as in the app */
function transferFormValues(args: TransferArgs, { source, target, occurredOn }: TransferEnds) {
  return transferFormSchema.parse({
    fromAccountId: source.id,
    toAccountId: target.id,
    fromAmount: fromMinor(args.amount_minor, source.currency),
    fromCurrency: source.currency,
    toAmount: minorText(args.to_amount_minor, target.currency),
    toCurrency: target.currency,
    fee: minorText(args.fee_minor, source.currency),
    feeCategoryId: args.fee_category_id ?? null,
    occurredOn,
    note: args.note ?? '',
  })
}

async function planTransfer(args: TransferArgs, context: ToolContext): Promise<WritePlan> {
  const [source, target] = await Promise.all([
    findAccount(context, args.from_account_id),
    findAccount(context, args.to_account_id),
  ])
  const occurredOn = args.occurred_on ?? context.today
  const id = args.id ?? crypto.randomUUID()

  assertPast(context, occurredOn)

  const values = transferFormValues(args, {
    source,
    target,
    occurredOn,
  })
  const input = toCreateTransferInput(values, clockOf(context), {
    id,
    ledgerId: context.ledger.id,
  })

  return {
    willWrite: input,
    replayArgs: {
      ...args,
      id,
    },
    createdIds: [id],
    write: () => createTransfer(context.supabase, input),
  }
}

const refundArgs = z.object({
  ledger_id: ledgerIdField,
  id: newIdField,
  purchase_id: z.uuid().describe('The expense it returns (search_operations)'),
  amount_minor: z.int().positive().optional().describe('Default: what is not refunded yet'),
  account_id: z.uuid().optional().describe('Default: the account of the purchase; the same currency'),
  occurred_on: dayField,
  note: noteField.optional(),
  confirm: confirmField,
})

type RefundArgs = z.infer<typeof refundArgs>

/** the asked amount, at most what is left of the expense after the refunds already linked to it (the refund form) */
async function refundAmount({ supabase, ledger }: ToolContext, purchase: OperationRow, asked: number | undefined) {
  if (purchase.kind !== 'expense') {
    throw new ToolError('invalid_input', 'Only an expense is refunded.')
  }

  const { refundedById } = await listRefundLinks(supabase, ledger.id)
  const leftMinor = purchase.amountMinor - (refundedById[purchase.id] ?? 0)
  const amountMinor = asked ?? leftMinor

  if (amountMinor <= 0 || amountMinor > leftMinor) {
    throw new ToolError('invalid_input', `${leftMinor} minor units of this purchase are left to refund.`)
  }

  return amountMinor
}

async function refundAccount(context: ToolContext, purchase: OperationRow, accountId: string | undefined) {
  const account = await findAccount(context, accountId ?? purchase.accountId)

  if (account.currency !== purchase.currency) {
    throw new ToolError('invalid_input', 'A refund goes to an account in the purchase currency.')
  }

  return account
}

async function planRefund(args: RefundArgs, context: ToolContext): Promise<WritePlan> {
  const purchase = await findOperation(context, args.purchase_id)
  const amountMinor = await refundAmount(context, purchase, args.amount_minor)
  const account = await refundAccount(context, purchase, args.account_id)
  const occurredOn = args.occurred_on ?? context.today
  const id = args.id ?? crypto.randomUUID()
  const values = factFormSchema(context.today).parse({
    kind: 'refund',
    direction: 'in',
    amount: fromMinor(amountMinor, purchase.currency),
    currency: purchase.currency,
    accountId: account.id,
    categoryId: purchase.categoryId,
    occurredOn,
    occurredTime: '',
    counterparty: purchase.counterparty ?? '',
    note: args.note ?? '',
  })
  const input = toCreateOperationInput(values, clockOf(context), {
    id,
    ledgerId: context.ledger.id,
    refundOfId: purchase.id,
  })

  return {
    willWrite: input,
    replayArgs: {
      ...args,
      id,
    },
    createdIds: [id],
    write: () => createOperation(context.supabase, input),
  }
}

/** the operation editor, the transfer form and «Refund» of an expense */
export const OPERATIONS_WRITE_TOOLS = [
  confirmedWriteTool(
    'update_operation',
    {
      title: 'Change an operation',
      description:
        'Changes the amount, account, date, category, payee or note of a recorded expense, income, refund or adjustment.',
      inputSchema: updateOperationArgs,
      destructive: true,
    },
    planUpdateOperation,
  ),
  confirmedWriteTool(
    'add_transfer',
    {
      title: 'Transfer between accounts',
      description:
        'Records a transfer between two accounts of the space (two linked operations, neither expense nor income); a fee becomes its own expense.',
      inputSchema: transferArgs,
      destructive: false,
    },
    planTransfer,
  ),
  confirmedWriteTool(
    'add_refund',
    {
      title: 'Record a refund',
      description:
        'Records money returned for an expense: a refund linked to it, in its category; it lowers the expense and is not an income.',
      inputSchema: refundArgs,
      destructive: false,
    },
    planRefund,
  ),
]
