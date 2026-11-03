import 'server-only'
import type { McpServer } from '@modelcontextprotocol/server'
import { z } from 'zod'
import { createOperation, listOperations } from '@/features/operations/api/operations.api'
import { type CreateOperationInput, createOperationInputSchema } from '@/lib/finance/create-operation-input.schema'
import { toOccurredAt } from '@/lib/utils/clock.utils'
import { registerReadTool, registerWriteTool } from '../register-tool.server'
import type { ToolContext } from '../tool-context.server'
import { ledgerIdField } from '../tool-input.schema'
import { ToolError, toPreview } from '../tool-result.utils'
import { assertWriter, findAccount } from '../write-checks.server'

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
