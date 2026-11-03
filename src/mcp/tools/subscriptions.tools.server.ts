import 'server-only'
import type { McpServer } from '@modelcontextprotocol/server'
import { z } from 'zod'
import { CURRENCIES } from '@/constants/currencies.constants'
import {
  createSubscription,
  listSubscriptionPayments,
  listSubscriptions,
  type SubscriptionView,
  setSubscriptionPrice,
  updateSubscription,
} from '@/features/subscriptions/api/subscriptions.api'
import {
  type StatusChange,
  subscriptionFormInput,
  subscriptionFormSchema,
  toCancelInput,
  toCreateSubscriptionInput,
  toSetPriceInput,
  toStatusChangeInput,
  toUpdateSubscriptionInput,
} from '@/features/subscriptions/schemas/subscription-form.schema'
import { RECURRENCE_UNITS, SHORT_MONTH_RULES } from '@/features/subscriptions/schemas/subscription-input.schema'
import { SUBSCRIPTION_VERDICTS } from '@/features/subscriptions/utils/subscription-series.utils'
import { confirmedWriteTool, registerReadTool, type WritePlan } from '../register-tool.server'
import type { ToolContext } from '../tool-context.server'
import { confirmField, dayField, ledgerIdField, newIdField, spaceInput, versionField } from '../tool-input.schema'
import { required } from '../tool-result.utils'
import { findAccount, orCurrent } from '../write-checks.server'

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

const nameField = z.string().trim().min(1).max(80)
const countField = z.int().min(1).max(999).describe('Every count units: unit month with count 3 = quarterly')
const firstOnField = z.iso.date().describe('The first charge, YYYY-MM-DD')
const shortMonthField = z
  .enum(SHORT_MONTH_RULES)
  .describe('A charge day a short month lacks: last_day, next_month_first or skip')
const textField = z.string().trim().max(500)

const createInput = z.object({
  ledger_id: ledgerIdField,
  id: newIdField,
  price_id: newIdField,
  name: nameField.describe('The service, e.g. Netflix'),
  amount_minor: z.int().positive().nullable().describe('Price per period in minor units; null = not known yet'),
  currency: z.enum(CURRENCIES).optional().describe('Default: the base currency of the space'),
  account_id: z.uuid().describe('The account it is paid from (get_balances)'),
  unit: z.enum(RECURRENCE_UNITS).default('month'),
  count: countField.default(1),
  first_on: firstOnField.optional().describe('The first charge, YYYY-MM-DD; default today'),
  short_month_rule: shortMonthField.default('last_day'),
  status: z.enum(['active', 'trial']).default('active'),
  trial_ends_on: z.iso.date().optional().describe('The last day of a trial'),
  service_url: textField.optional(),
  note: textField.optional(),
  confirm: confirmField,
})

type CreateInput = z.infer<typeof createInput>

/** the form's own values, so the form schema checks them as in the app */
function newFormValues(args: CreateInput, accountId: string, { ledger, today }: ToolContext) {
  return subscriptionFormSchema.parse({
    service: 'custom',
    name: args.name,
    amountMinor: args.amount_minor,
    currency: args.currency ?? ledger.baseCurrency,
    accountId,
    unit: args.unit,
    count: String(args.count),
    firstOn: args.first_on ?? today,
    shortMonthRule: args.short_month_rule,
    status: args.status,
    trialEndsOn: args.trial_ends_on ?? null,
    serviceUrl: args.service_url ?? '',
    note: args.note ?? '',
  })
}

async function planCreate(args: CreateInput, context: ToolContext): Promise<WritePlan> {
  const id = args.id ?? crypto.randomUUID()
  const priceId = args.price_id ?? crypto.randomUUID()
  const account = await findAccount(context, args.account_id)
  const input = toCreateSubscriptionInput(newFormValues(args, account.id, context), {
    id,
    priceId,
    ledgerId: context.ledger.id,
    today: context.today,
  })

  return {
    willWrite: input,
    replayArgs: {
      ...args,
      id,
      price_id: priceId,
    },
    createdIds: [id, priceId],
    write: () => createSubscription(context.supabase, input),
  }
}

const updateInput = z.object({
  ledger_id: ledgerIdField,
  subscription_id: subscriptionIdField,
  name: nameField.optional(),
  account_id: z.uuid().optional(),
  unit: z.enum(RECURRENCE_UNITS).optional(),
  count: countField.optional(),
  first_on: firstOnField.optional(),
  short_month_rule: shortMonthField.optional(),
  trial_ends_on: z.iso.date().nullable().optional(),
  service_url: textField.nullable().optional(),
  note: textField.nullable().optional(),
  verdict: z
    .enum(SUBSCRIPTION_VERDICTS)
    .nullable()
    .optional()
    .describe("keep, review or cancel: the person's own assessment"),
  version: versionField,
  confirm: confirmField,
})

type UpdateInput = z.infer<typeof updateInput>

function editedFormValues(args: UpdateInput, subscription: SubscriptionView) {
  const form = subscriptionFormInput(subscription)

  return subscriptionFormSchema.parse({
    ...form,
    name: orCurrent(args.name, form.name),
    accountId: orCurrent(args.account_id, form.accountId),
    unit: orCurrent(args.unit, form.unit),
    count: args.count === undefined ? form.count : String(args.count),
    firstOn: orCurrent(args.first_on, form.firstOn),
    shortMonthRule: orCurrent(args.short_month_rule, form.shortMonthRule),
    trialEndsOn: orCurrent(args.trial_ends_on, form.trialEndsOn),
    serviceUrl: orCurrent(args.service_url, form.serviceUrl) ?? '',
    note: orCurrent(args.note, form.note) ?? '',
  })
}

async function planUpdate(args: UpdateInput, context: ToolContext): Promise<WritePlan> {
  const subscription = await findSubscription(context, args.subscription_id)

  if (args.account_id) {
    await findAccount(context, args.account_id)
  }

  const edit = toUpdateSubscriptionInput(editedFormValues(args, subscription), subscription, context.today)
  const input =
    args.verdict === undefined
      ? edit
      : {
          ...edit,
          patch: {
            ...edit.patch,
            verdict: args.verdict,
          },
        }

  return {
    willWrite: input,
    replayArgs: args,
    version: subscription.version,
    write: () => updateSubscription(context.supabase, input),
  }
}

const priceInput = z.object({
  ledger_id: ledgerIdField,
  subscription_id: subscriptionIdField,
  id: newIdField,
  amount_minor: z.int().positive().describe('The new price per period in minor units'),
  effective_on: dayField.describe('The first charge date it applies to, YYYY-MM-DD; default today'),
  version: versionField,
  confirm: confirmField,
})

type PriceInput = z.infer<typeof priceInput>

async function planPrice(args: PriceInput, context: ToolContext): Promise<WritePlan> {
  const subscription = await findSubscription(context, args.subscription_id)
  const id = args.id ?? crypto.randomUUID()
  const values = {
    amountMinor: args.amount_minor,
    effectiveOn: args.effective_on ?? context.today,
  }
  const input = toSetPriceInput(values, subscription, id)

  return {
    willWrite: input,
    replayArgs: {
      ...args,
      id,
    },
    createdIds: [id],
    version: subscription.version,
    write: () => setSubscriptionPrice(context.supabase, input),
  }
}

const STATUS_ACTIONS = ['pause', 'resume', 'cancel', 'cancel_intended', 'archive', 'restore'] as const

const statusInput = z.object({
  ledger_id: ledgerIdField,
  subscription_id: subscriptionIdField,
  action: z
    .enum(STATUS_ACTIONS)
    .describe(
      'pause; resume = active again; cancel = cancelled at the service, no charges from today; cancel_intended = going to cancel, charged until confirmed; archive = stop tracking, the history stays; restore = back from the archive',
    ),
  access_ends_on: z.iso.date().optional().describe('cancel: the paid access lasts until this day'),
  version: versionField,
  confirm: confirmField,
})

type StatusInput = z.infer<typeof statusInput>

/** the same changes as the card's menu (subscription-overview, confirm-status-sheet) */
const STATUS_CHANGES: Record<'pause' | 'resume' | 'archive' | 'restore', (now: Date) => StatusChange> = {
  pause: () => ({ status: 'paused' }),
  resume: () => ({
    status: 'active',
    cancelledOn: null,
    accessEndsOn: null,
  }),
  archive: (now) => ({ archivedAt: now.toISOString() }),
  restore: () => ({ archivedAt: null }),
}

function statusUpdate(args: StatusInput, subscription: SubscriptionView, { today, now }: ToolContext) {
  if (args.action === 'cancel' || args.action === 'cancel_intended') {
    const values = {
      outcome: args.action === 'cancel' ? ('cancelled' as const) : ('cancel_intended' as const),
      accessEndsOn: args.access_ends_on ?? null,
    }

    return toCancelInput(values, subscription, today)
  }

  return toStatusChangeInput(subscription, STATUS_CHANGES[args.action](now), today)
}

async function planStatus(args: StatusInput, context: ToolContext): Promise<WritePlan> {
  const subscription = await findSubscription(context, args.subscription_id)
  const input = statusUpdate(args, subscription, context)

  return {
    willWrite: input,
    replayArgs: args,
    version: subscription.version,
    write: () => updateSubscription(context.supabase, input),
  }
}

/** the subscription card's writes; the category is always the system Subscriptions one (a DB trigger sets it) */
export const SUBSCRIPTIONS_WRITE_TOOLS = [
  confirmedWriteTool(
    'create_subscription',
    {
      title: 'Add a subscription',
      description:
        'Adds a subscription with its first price and its planned charges for the coming months; Saldo files it under the system category «Підписки».',
      inputSchema: createInput,
      destructive: false,
    },
    planCreate,
  ),
  confirmedWriteTool(
    'update_subscription',
    {
      title: 'Change a subscription',
      description:
        "Changes a subscription's name, account, period, first date, trial, link, note or verdict; its unpaid charges from today follow, paid ones stay. A new price goes through set_subscription_price.",
      inputSchema: updateInput,
      destructive: true,
    },
    planUpdate,
  ),
  confirmedWriteTool(
    'set_subscription_price',
    {
      title: 'Change a subscription price',
      description:
        'Sets a new subscription price from a date: unpaid charges from that date take it, paid ones keep what they were paid at.',
      inputSchema: priceInput,
      destructive: true,
    },
    planPrice,
  ),
  confirmedWriteTool(
    'set_subscription_status',
    {
      title: 'Pause, resume, cancel or archive a subscription',
      description:
        'Pauses, resumes, cancels or archives a subscription (archive is the app’s delete: the history stays); its unpaid charges from today follow the new state.',
      inputSchema: statusInput,
      destructive: true,
    },
    planStatus,
  ),
]
