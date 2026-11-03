import type { CallToolResult } from '@modelcontextprotocol/server'
import { ZodError } from 'zod'
import { type PgError, toPgError } from '@/lib/supabase/pg-error.utils'

/** keys whose text a person or a bank statement typed (descriptions, payees, notes): data for the model, never orders */
const UNTRUSTED_KEYS = new Set(['counterparty', 'note', 'title', 'description', 'reason'])

/** longer answers are refused with a hint to narrow the call: Claude Code warns from about 10k tokens */
export const MAX_RESULT_CHARS = 60_000

/** a tool's own refusal: its message goes to the model as is */
export class ToolError extends Error {
  readonly code: string

  constructor(code: string, message: string) {
    super(message)
    this.code = code
  }
}

const wrapEntry = ([key, item]: [string, unknown]) => [
  key,
  typeof item === 'string' && UNTRUSTED_KEYS.has(key) ? { untrusted_text: item } : markUntrusted(item),
]

/** every string under an UNTRUSTED_KEYS key, at any depth, becomes { untrusted_text } (plan 10.10) */
export function markUntrusted(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(markUntrusted)
  }

  if (value === null || typeof value !== 'object') {
    return value
  }

  return Object.fromEntries(Object.entries(value).map(wrapEntry))
}

export const errorResult = (message: string): CallToolResult => ({
  isError: true,
  content: [
    {
      type: 'text',
      text: message,
    },
  ],
})

/** JSON for the model (text) and for clients that read structuredContent; free text wrapped, size capped */
export function toToolResult(data: Record<string, unknown>): CallToolResult {
  const structured = markUntrusted(data) as Record<string, unknown>
  const text = JSON.stringify(structured)

  if (text.length > MAX_RESULT_CHARS) {
    return errorResult(
      `The answer is too large (${text.length} characters, the limit is ${MAX_RESULT_CHARS}): narrow it with dates, filters or limit.`,
    )
  }

  return {
    content: [
      {
        type: 'text',
        text,
      },
    ],
    structuredContent: structured,
  }
}

const DB_MESSAGES: Record<PgError['kind'], string> = {
  forbidden:
    'Not allowed: you only view this space, you are not its member, or an MCP client may not do this (it never deletes).',
  conflict: 'Someone changed this record meanwhile: read it again and retry with its new version.',
  expired: 'This is no longer valid.',
  notFound: 'The record is gone or was never in this space.',
  duplicate: 'This id is taken by another record: use a new id.',
  invalid: 'Saldo refused the values: a check of the record failed.',
  reference: 'An id points to nothing in this space (account, category or planned payment): list them first.',
  unknown: 'Saldo could not do it because of an unexpected error.',
}

type DescribedError = {
  code: string
  message: string
}

const issueText = (error: ZodError) =>
  error.issues.map((issue) => `${issue.path.join('.') || 'input'}: ${issue.message}`).join('; ')

/** a code for mcp_audit_log and a message for the model; Postgres codes are mapped by the app's own pg-error.utils */
export function describeError(error: unknown): DescribedError {
  if (error instanceof ToolError) {
    return {
      code: error.code,
      message: error.message,
    }
  }

  if (error instanceof ZodError) {
    return {
      code: 'invalid_input',
      message: `Invalid input: ${issueText(error)}`,
    }
  }

  const source = error as {
    code?: string
    message?: string
  }
  const { kind, constraint } = toPgError(source)

  return {
    code: source.code ?? kind,
    message: constraint ? `${DB_MESSAGES[kind]} (${constraint})` : DB_MESSAGES[kind],
  }
}
