import 'server-only'
import type { McpServer } from '@modelcontextprotocol/server'
import { z } from 'zod'
import { CURRENCIES } from '@/constants/currencies.constants'
import {
  adjustBalance,
  createAccount,
  getAccountActivity,
  getAccounts,
  updateAccount,
} from '@/features/accounts/api/accounts.api'
import { accountFormSchema, toCreateAccountInput } from '@/features/accounts/schemas/account-form.schema'
import { updateAccountInputSchema } from '@/features/accounts/schemas/account-input.schema'
import { adjustmentFormSchema, toAdjustmentInput } from '@/features/accounts/schemas/adjustment-form.schema'
import { ACCOUNT_KINDS, nextSortOrder } from '@/features/accounts/utils/accounts.utils'
import { listOperations } from '@/features/operations/api/operations.api'
import { fromMinor } from '@/lib/money/money.utils'
import { confirmedWriteTool, registerReadTool, type WritePlan } from '../register-tool.server'
import type { ToolContext } from '../tool-context.server'
import { confirmField, dayField, ledgerIdField, newIdField, spaceInput } from '../tool-input.schema'
import { required, ToolError } from '../tool-result.utils'
import { assertChanges, assertPast, clockOf } from '../write-checks.server'

/** the card's latest rows; search_operations with account_id gives the rest */
const RECENT_OPERATIONS = 20

/** the Operations screen without filters */
const EVERY_OPERATION = {
  from: null,
  to: null,
  type: 'all',
  categoryId: null,
  createdBy: null,
  text: null,
} as const

const accountIdField = z.uuid().describe('From get_balances')

/** an account of the space, archived ones too, with its version and balance */
async function findAccountView({ supabase, ledger, today }: ToolContext, id: string) {
  const { accounts } = await getAccounts(supabase, {
    ledgerId: ledger.id,
    today,
  })

  return required(
    accounts.find((item) => item.id === id),
    'No such account in this space: get_balances lists them.',
  )
}

const accountInput = z.object({
  ledger_id: ledgerIdField,
  account_id: accountIdField,
})

function registerGetAccount(server: McpServer) {
  registerReadTool(
    server,
    'get_account',
    {
      title: 'Account with recent activity',
      description:
        'One account with its balance, settings, how many operations it has and the latest 20 of them (transfer legs included). Amounts in minor units of the account currency.',
      inputSchema: accountInput,
    },
    async ({ account_id }, context) => {
      const { supabase, ledger } = context
      const account = await findAccountView(context, account_id)
      const [activity, recent] = await Promise.all([
        getAccountActivity(supabase, {
          ledgerId: ledger.id,
          accountId: account.id,
        }),
        listOperations(supabase, {
          ledgerId: ledger.id,
          filters: {
            ...EVERY_OPERATION,
            accountId: account.id,
          },
        }),
      ])

      return {
        data: {
          account,
          operationsCount: activity.count,
          recentOperations: recent.rows.slice(0, RECENT_OPERATIONS),
        },
      }
    },
  )
}

export function registerAccountsTools(server: McpServer) {
  registerReadTool(
    server,
    'get_balances',
    {
      title: 'Account balances',
      description:
        "Accounts of the space with their current balance in the account currency (balanceMinor) and in the base currency on today's rate (baseMinor, null when no rate is known). Archived accounts have archivedAt set.",
      inputSchema: spaceInput,
    },
    async (_args, { supabase, ledger, today }) => ({
      data: await getAccounts(supabase, {
        ledgerId: ledger.id,
        today,
      }),
    }),
  )

  registerGetAccount(server)
}

const accountNameField = z.string().trim().min(1).max(80)

const createAccountInput = z.object({
  ledger_id: ledgerIdField,
  id: newIdField,
  name: accountNameField,
  kind: z.enum(ACCOUNT_KINDS),
  currency: z.enum(CURRENCIES).optional().describe('Default: the base currency; it never changes later'),
  opening_balance_minor: z.int().describe('The balance on opening_on in minor units; negative when money is owed'),
  opening_on: dayField,
  confirm: confirmField,
})

type CreateAccountArgs = z.infer<typeof createAccountInput>

async function planCreateAccount(args: CreateAccountArgs, context: ToolContext): Promise<WritePlan> {
  const { supabase, ledger, today } = context
  const id = args.id ?? crypto.randomUUID()
  const { accounts } = await getAccounts(supabase, {
    ledgerId: ledger.id,
    today,
  })
  const values = accountFormSchema.parse({
    name: args.name,
    kind: args.kind,
    currency: args.currency ?? ledger.baseCurrency,
    openingBalanceMinor: args.opening_balance_minor,
    openingOn: args.opening_on ?? today,
  })
  const input = toCreateAccountInput(values, {
    id,
    ledgerId: ledger.id,
    sortOrder: nextSortOrder(accounts),
  })

  return {
    willWrite: input,
    replayArgs: {
      ...args,
      id,
    },
    createdIds: [id],
    write: () => createAccount(supabase, input),
  }
}

const updateAccountArgs = z.object({
  ledger_id: ledgerIdField,
  account_id: accountIdField,
  name: accountNameField.optional(),
  kind: z.enum(ACCOUNT_KINDS).optional(),
  include_in_total: z.boolean().optional().describe('Counts in the total of all accounts'),
  include_in_available: z.boolean().optional().describe('Counts in «Available to date»'),
  confirm: confirmField,
})

async function planUpdateAccount(args: z.infer<typeof updateAccountArgs>, context: ToolContext): Promise<WritePlan> {
  const account = await findAccountView(context, args.account_id)
  const patch = {
    name: args.name,
    kind: args.kind,
    include_in_total: args.include_in_total,
    include_in_available: args.include_in_available,
  }

  assertChanges(patch)

  const input = updateAccountInputSchema.parse({
    id: account.id,
    expectedVersion: account.version,
    patch,
  })

  return {
    willWrite: input,
    replayArgs: args,
    write: () => updateAccount(context.supabase, input),
  }
}

const archiveAccountArgs = z.object({
  ledger_id: ledgerIdField,
  account_id: accountIdField,
  archived: z.boolean().default(true).describe('false brings it back from the archive'),
  confirm: confirmField,
})

async function planArchiveAccount(args: z.infer<typeof archiveAccountArgs>, context: ToolContext): Promise<WritePlan> {
  const account = await findAccountView(context, args.account_id)
  const input = {
    id: account.id,
    expectedVersion: account.version,
    patch: { archived_at: args.archived ? context.now.toISOString() : null },
  }

  return {
    willWrite: input,
    replayArgs: args,
    write: () => updateAccount(context.supabase, input),
  }
}

const adjustArgs = z.object({
  ledger_id: ledgerIdField,
  account_id: accountIdField,
  id: newIdField,
  actual_balance_minor: z.int().describe('The real balance now, in minor units of the account currency'),
  note: z.string().trim().min(1).max(500).describe('Why it differs (required, as in the app)'),
  occurred_on: dayField,
  confirm: confirmField,
})

type AdjustArgs = z.infer<typeof adjustArgs>

async function planAdjust(args: AdjustArgs, context: ToolContext): Promise<WritePlan> {
  const account = await findAccountView(context, args.account_id)
  const occurredOn = args.occurred_on ?? context.today
  const id = args.id ?? crypto.randomUUID()

  if (account.archivedAt) {
    throw new ToolError('reference', 'The account is archived: archive_account with archived false brings it back.')
  }

  assertPast(context, occurredOn)

  const values = adjustmentFormSchema.parse({
    actual: fromMinor(args.actual_balance_minor, account.currency),
    currency: account.currency,
    currentMinor: account.balanceMinor,
    occurredOn,
    note: args.note,
  })
  const input = toAdjustmentInput(values, clockOf(context), {
    id,
    ledgerId: context.ledger.id,
    accountId: account.id,
  })

  return {
    willWrite: input,
    replayArgs: {
      ...args,
      id,
    },
    createdIds: [id],
    write: () => adjustBalance(context.supabase, input),
  }
}

/** the account form, «Archive» and «Adjust balance» of the account card */
export const ACCOUNTS_WRITE_TOOLS = [
  confirmedWriteTool(
    'create_account',
    {
      title: 'Add an account',
      description: 'Adds an account (card, cash, savings…) with its currency and opening balance.',
      inputSchema: createAccountInput,
      destructive: false,
    },
    planCreateAccount,
  ),
  confirmedWriteTool(
    'update_account',
    {
      title: 'Change an account',
      description:
        'Renames an account, changes its kind, or whether it counts in the total and in «Available to date»; the currency and opening balance never change.',
      inputSchema: updateAccountArgs,
      destructive: true,
    },
    planUpdateAccount,
  ),
  confirmedWriteTool(
    'archive_account',
    {
      title: 'Archive an account',
      description:
        'Archives an account (or restores it with archived false): it leaves the pickers and totals, its operations stay.',
      inputSchema: archiveAccountArgs,
      destructive: true,
    },
    planArchiveAccount,
  ),
  confirmedWriteTool(
    'adjust_balance',
    {
      title: 'Adjust an account balance',
      description:
        'Brings an account balance to the real one with an adjustment operation of the difference; an adjustment is neither income nor expense.',
      inputSchema: adjustArgs,
      destructive: false,
    },
    planAdjust,
  ),
]
