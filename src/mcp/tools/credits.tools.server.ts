import 'server-only'
import type { McpServer } from '@modelcontextprotocol/server'
import { z } from 'zod'
import { listCredits } from '@/features/credits/api/credits.api'
import { creditProgress, payoffOf } from '@/features/credits/utils/credits.utils'
import { registerReadTool } from '../register-tool.server'
import type { ToolContext } from '../tool-context.server'
import { ledgerIdField, spaceInput } from '../tool-input.schema'
import { required } from '../tool-result.utils'

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
