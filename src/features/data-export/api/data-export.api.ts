import type { PostgrestError } from '@supabase/supabase-js'
import type { SaldoClient } from '@/types/supabase.types'
import type { CsvOperation } from '../utils/operations-csv.utils'

// PostgREST returns at most max_rows (supabase/config.toml) a request, so every list is read page by page
const PAGE = 1000
const ATTACHMENT_BUCKET = 'attachments'
// the most paths one Storage remove call takes
const REMOVE_CHUNK = 1000

/** every table of a space the full export writes, ordered by id; ledger_invites stay out (token hashes, owner-only) */
const EXPORT_TABLES = [
  'accounts',
  'categories',
  'operations',
  'transfers',
  'attachments',
  'obligations',
  'obligation_payments',
  'subscriptions',
  'subscription_prices',
  'credits',
  'debts',
  'debt_movements',
  'budget_months',
  'budget_limits',
  'fx_rates',
  'reminder_rules',
  'notifications',
  'calendar_saved_filters',
] as const

type Page<Row> = PromiseLike<{
  data: Row[] | null
  error: PostgrestError | null
}>

async function readAll<Row>(page: (start: number, end: number) => Page<Row>): Promise<Row[]> {
  const rows: Row[] = []

  for (let start = 0; ; start += PAGE) {
    const { data, error } = await page(start, start + PAGE - 1)

    if (error) {
      throw error
    }

    rows.push(...(data ?? []))

    if ((data ?? []).length < PAGE) {
      return rows
    }
  }
}

/** all operations of the space, oldest first, with account and category names (RLS: any member) */
export async function listOperationsForCsv(supabase: SaldoClient, ledgerId: string): Promise<CsvOperation[]> {
  const rows = await readAll((start, end) =>
    supabase
      .from('operations')
      .select(
        'occurred_on, kind, direction, amount_minor, currency, base_amount_minor, base_currency, counterparty, note, account:accounts(name), category:categories(name)',
      )
      .eq('ledger_id', ledgerId)
      .order('occurred_on')
      .order('occurred_at')
      .order('id')
      .range(start, end),
  )

  return rows.map((row) => ({
    occurredOn: row.occurred_on,
    kind: row.kind,
    direction: row.direction as CsvOperation['direction'],
    amountMinor: row.amount_minor,
    currency: row.currency,
    baseAmountMinor: row.base_amount_minor,
    baseCurrency: row.base_currency,
    account: row.account?.name ?? null,
    category: row.category?.name ?? null,
    counterparty: row.counterparty,
    note: row.note,
  }))
}

/** the space row and every table of it as stored (RLS: any member) */
export async function readSpaceData(supabase: SaldoClient, ledgerId: string) {
  const ledger = await supabase.from('ledgers').select('*').eq('id', ledgerId).single()

  if (ledger.error) {
    throw ledger.error
  }

  const members = await readAll((start, end) =>
    supabase.from('ledger_members').select('*').eq('ledger_id', ledgerId).order('user_id').range(start, end),
  )
  const tables = await Promise.all(
    EXPORT_TABLES.map(async (table) => {
      const rows = await readAll((start, end) =>
        supabase.from(table).select('*').eq('ledger_id', ledgerId).order('id').range(start, end),
      )

      return [table, rows] as const
    }),
  )

  const attachments = await readAll((start, end) =>
    supabase.from('attachments').select('storage_path').eq('ledger_id', ledgerId).order('id').range(start, end),
  )

  return {
    ledger: ledger.data,
    tables: Object.fromEntries([['ledger_members', members], ...tables]),
    attachmentPaths: attachments.map((row) => row.storage_path),
  }
}

export async function downloadAttachment(supabase: SaldoClient, path: string): Promise<Uint8Array> {
  const { data, error } = await supabase.storage.from(ATTACHMENT_BUCKET).download(path)

  if (error) {
    throw error
  }

  return new Uint8Array(await data.arrayBuffer())
}

/** owner only (42501 otherwise): empties the space, then removes its receipt files through the Storage API */
export async function deleteLedgerData(supabase: SaldoClient, ledgerId: string) {
  const { data: paths, error } = await supabase.rpc('delete_ledger_data', { p_ledger_id: ledgerId })

  if (error) {
    throw error
  }

  for (let start = 0; start < paths.length; start += REMOVE_CHUNK) {
    // best effort: a file left without its row goes with the daily orphan cleanup (/api/cron/daily)
    await supabase.storage.from(ATTACHMENT_BUCKET).remove(paths.slice(start, start + REMOVE_CHUNK))
  }
}
