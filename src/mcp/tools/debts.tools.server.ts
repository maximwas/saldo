import 'server-only'
import type { McpServer } from '@modelcontextprotocol/server'
import { z } from 'zod'
import { listDebtMovements, listDebts } from '@/features/debts/api/debts.api'
import { registerReadTool } from '../register-tool.server'
import type { ToolContext } from '../tool-context.server'
import { ledgerIdField, spaceInput } from '../tool-input.schema'
import { required } from '../tool-result.utils'

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
