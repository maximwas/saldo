import 'server-only'
import { createHash } from 'node:crypto'
import type { AuthInfo, CallToolResult, ServerContext } from '@modelcontextprotocol/server'
import { type MembershipRow, pickMembership, toActiveLedger } from '@/lib/auth/active-ledger.utils'
import { logger } from '@/lib/logger/logger.server'
import { createTokenSupabase } from '@/lib/supabase/token-client.server'
import { localDate } from '@/lib/utils/clock.utils'
import type { LedgerSummary } from '@/store/ledger.store'
import type { LedgerRole, SaldoClient } from '@/types/supabase.types'
import { describeError, errorResult, ToolError, toToolResult } from './tool-result.utils'

const log = logger.child({
  module: 'mcp',
})

type ToolLedger = {
  id: string
  name: string
  role: LedgerRole
  timeZone: string
  baseCurrency: string
}

/** what a tool body gets: the caller's own client (RLS) and the space it works in */
export type ToolContext = {
  supabase: SaldoClient
  userId: string
  ledger: ToolLedger
  ledgers: LedgerSummary[]
  now: Date
  /** YYYY-MM-DD in the space's time zone */
  today: string
}

type ToolOutcome = {
  data: Record<string, unknown>
  /** a write tool without confirm: true answered with a preview and wrote nothing */
  preview?: boolean
  createdIds?: string[]
}

export type ToolBody<Args> = (args: Args, context: ToolContext) => Promise<ToolOutcome>

type LedgerArgs = {
  ledger_id?: string
}

async function readMemberships(supabase: SaldoClient, userId: string) {
  const [memberships, settings] = await Promise.all([
    supabase
      .from('ledger_members')
      .select('ledger_id, role, ledgers(name, time_zone, base_currency)')
      .eq('user_id', userId),
    supabase.from('user_settings').select('last_ledger_id').eq('user_id', userId).maybeSingle(),
  ])

  if (memberships.error) {
    throw memberships.error
  }

  return {
    rows: memberships.data as MembershipRow[],
    lastLedgerId: settings.data?.last_ledger_id ?? null,
  }
}

/** the asked space only if the caller is its member (never another one instead); none asked = the last one opened */
async function resolveLedger(supabase: SaldoClient, userId: string, ledgerId: string | undefined) {
  const { rows, lastLedgerId } = await readMemberships(supabase, userId)
  const membership = ledgerId ? rows.find((row) => row.ledger_id === ledgerId) : pickMembership(rows, [lastLedgerId])

  if (!membership) {
    throw new ToolError('42501', 'You are not a member of this space: list_ledgers gives the spaces you can use.')
  }

  const active = toActiveLedger(membership, rows)

  return {
    ledger: {
      id: active.ledgerId,
      name: membership.ledgers?.name ?? '',
      role: active.role,
      timeZone: active.timeZone,
      baseCurrency: active.baseCurrency,
    },
    ledgers: active.ledgers,
  }
}

type AuditEntry = {
  tool: string
  args: unknown
  ledgerId: string | null
  outcome: 'ok' | 'preview' | 'error'
  errorCode?: string
  createdIds?: string[]
}

/** one mcp_audit_log row per call, with the caller's token; a failed write is logged, the call's answer stands */
async function audit(supabase: SaldoClient, authInfo: AuthInfo, entry: AuditEntry) {
  const { error } = await supabase.from('mcp_audit_log').insert({
    ledger_id: entry.ledgerId,
    client_id: authInfo.clientId,
    tool: entry.tool,
    input_hash: createHash('sha256')
      .update(JSON.stringify(entry.args ?? {}))
      .digest('hex'),
    outcome: entry.outcome,
    error_code: entry.errorCode?.slice(0, 64) ?? null,
    created_ids: entry.createdIds ?? [],
  })

  if (error) {
    log.error(
      {
        tool: entry.tool,
        code: error.code,
      },
      'mcp audit insert failed',
    )
  }
}

async function contextOf(supabase: SaldoClient, authInfo: AuthInfo, ledgerId: string | undefined) {
  const userId = String(authInfo.extra?.userId)
  const space = await resolveLedger(supabase, userId, ledgerId)
  const now = new Date()

  return {
    supabase,
    userId,
    ...space,
    now,
    today: localDate(now, space.ledger.timeZone),
  }
}

type Call<Args> = {
  tool: string
  args: Args
  body: ToolBody<Args>
  supabase: SaldoClient
  authInfo: AuthInfo
  /** set once the caller's space is known, so a failed call is audited in it */
  ledgerId: string | null
}

/** the body in the caller's space; the answer names the space, the audit row says what came of it */
async function succeed<Args extends object>(call: Call<Args>) {
  const { tool, args, body, supabase, authInfo } = call
  const context = await contextOf(supabase, authInfo, (args as LedgerArgs).ledger_id)

  call.ledgerId = context.ledger.id

  const outcome = await body(args, context)
  const { id, name, role } = context.ledger

  await audit(supabase, authInfo, {
    tool,
    args,
    ledgerId: id,
    outcome: outcome.preview ? 'preview' : 'ok',
    createdIds: outcome.createdIds,
  })

  return toToolResult({
    ledger: {
      id,
      name,
      role,
    },
    ...outcome.data,
  })
}

async function fail<Args>({ tool, args, supabase, authInfo, ledgerId }: Call<Args>, error: unknown) {
  const described = describeError(error)

  log.warn(
    {
      tool,
      code: described.code,
    },
    'mcp tool failed',
  )
  await audit(supabase, authInfo, {
    tool,
    args,
    ledgerId,
    outcome: 'error',
    errorCode: described.code,
  })

  return errorResult(described.message)
}

/** registerTool callback: withMcpAuth already checked the token; every call, good or failed, is audited */
export function toolHandler<Args extends object>(tool: string, body: ToolBody<Args>) {
  return async (args: Args, ctx: ServerContext): Promise<CallToolResult> => {
    const authInfo = ctx.http?.authInfo

    if (!authInfo) {
      return errorResult('Not signed in.')
    }

    const call: Call<Args> = {
      tool,
      args,
      body,
      supabase: createTokenSupabase(authInfo.token),
      authInfo,
      ledgerId: null,
    }

    try {
      return await succeed(call)
    } catch (error) {
      return await fail(call, error)
    }
  }
}
