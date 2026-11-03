import 'server-only'
import type { McpServer } from '@modelcontextprotocol/server'
import { z } from 'zod'
import { listSubscriptionPayments, listSubscriptions } from '@/features/subscriptions/api/subscriptions.api'
import { registerReadTool } from '../register-tool.server'
import type { ToolContext } from '../tool-context.server'
import { ledgerIdField, spaceInput } from '../tool-input.schema'
import { required } from '../tool-result.utils'

const subscriptionIdField = z.uuid().describe('From list_subscriptions')

/** a subscription of the space with its version: edits are made from it */
async function findSubscription({ supabase, ledger }: ToolContext, id: string) {
  return required(
    (await listSubscriptions(supabase, ledger.id)).find((item) => item.id === id),
    'No such subscription in this space: list_subscriptions lists them.',
  )
}

const subscriptionInput = z.object({
  ledger_id: ledgerIdField,
  subscription_id: subscriptionIdField,
})

function registerGetSubscription(server: McpServer) {
  registerReadTool(
    server,
    'get_subscription',
    {
      title: 'Subscription card',
      description:
        'One subscription as its card shows it: settings, price history (prices from effectiveOn), status, verdict, and its planned and paid payments, oldest first (a paid one keeps the amount it was paid at). Amounts in minor units; null = unknown.',
      inputSchema: subscriptionInput,
    },
    async ({ subscription_id }, context) => {
      const subscription = await findSubscription(context, subscription_id)

      return {
        data: {
          subscription,
          payments: await listSubscriptionPayments(context.supabase, subscription.id),
        },
      }
    },
  )
}

export function registerSubscriptionsTools(server: McpServer) {
  registerReadTool(
    server,
    'list_subscriptions',
    {
      title: 'Subscriptions',
      description:
        "Subscriptions of the space with price, period, next charge, status (active, trial, paused, cancelled) and the person's verdict. Amounts in minor units.",
      inputSchema: spaceInput,
    },
    async (_args, { supabase, ledger }) => ({ data: { subscriptions: await listSubscriptions(supabase, ledger.id) } }),
  )

  registerGetSubscription(server)
}
