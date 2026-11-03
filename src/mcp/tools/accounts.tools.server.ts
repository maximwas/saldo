import 'server-only'
import type { McpServer } from '@modelcontextprotocol/server'
import { z } from 'zod'
import { getAccountActivity, getAccounts } from '@/features/accounts/api/accounts.api'
import { listOperations } from '@/features/operations/api/operations.api'
import { registerReadTool } from '../register-tool.server'
import type { ToolContext } from '../tool-context.server'
import { ledgerIdField, spaceInput } from '../tool-input.schema'
import { required } from '../tool-result.utils'

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
