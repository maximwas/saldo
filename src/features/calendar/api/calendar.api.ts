import { listAccountOptions, listCategoryOptions } from '@/lib/finance/ledger-options.api'
import type { Database, Json } from '@/types/database.types'
import type { SaldoClient } from '@/types/supabase.types'
import type { DayTotals } from '../utils/calendar.utils'
import { type CalendarFilter, calendarFilterSchema } from '../utils/calendar-filters.utils'

/** one fact (an operation) or one plan (what remains of an obligation); a paid plan is its fact, never both (§18) */
export type CalendarEntry = {
  /** operation id of a fact, obligation id of a plan */
  id: string
  entry: 'fact' | 'plan'
  day: string
  kind: string
  direction: 'in' | 'out' | null
  /** 'fact' or the obligation state */
  state: string
  title: string | null
  note: string | null
  /** a plan's remainder; null = unknown (§7), never 0 */
  amountMinor: number | null
  currency: string
  baseAmountMinor: number | null
  accountId: string | null
  obligationId: string | null
  sourceType: string | null
  sourceId: string | null
  /** the plan's own date: a fact paid on another day keeps it in its details (§18) */
  plannedOn: string | null
  plannedAmountMinor: number | null
  paidMinor: number | null
}

/** the same arguments for the screen and the MCP server: a range and a filter, never URL state (plan 2.10) */
export type CalendarParams = {
  ledgerId: string
  from: string
  to: string
  filter: CalendarFilter
}

export type SavedFilter = {
  id: string
  name: string
  filter: CalendarFilter
}

type EntryRow = Database['public']['Functions']['calendar_entries']['Returns'][number]
type TotalsRow = Database['public']['Functions']['calendar_day_totals']['Returns'][number]

const toEntry = (row: EntryRow): CalendarEntry => ({
  id: row.entry_id,
  entry: row.entry as CalendarEntry['entry'],
  day: row.day,
  kind: row.kind,
  direction: row.direction as CalendarEntry['direction'],
  state: row.state,
  title: row.title,
  note: row.note,
  amountMinor: row.amount_minor,
  currency: row.currency,
  baseAmountMinor: row.base_amount_minor,
  accountId: row.account_id,
  obligationId: row.obligation_id,
  sourceType: row.source_type,
  sourceId: row.source_id,
  plannedOn: row.planned_on,
  plannedAmountMinor: row.planned_amount_minor,
  paidMinor: row.paid_minor,
})

const toDayTotals = (row: TotalsRow): DayTotals => ({
  day: row.day,
  factIncomeMinor: row.fact_income_minor,
  factExpenseMinor: row.fact_expense_minor,
  planInMinor: row.plan_in_minor,
  planOutMinor: row.plan_out_minor,
  unknownCount: row.unknown_count,
  entriesCount: row.entries_count,
})

const rpcArgs = ({ ledgerId, from, to, filter }: CalendarParams) => ({
  p_ledger_id: ledgerId,
  p_from: from,
  p_to: to,
  p_filter: filter as Json,
})

/** facts and plans of one space in [from, to] that match the filter, by day */
export async function listCalendarEntries(supabase: SaldoClient, params: CalendarParams): Promise<CalendarEntry[]> {
  const { data, error } = await supabase.rpc('calendar_entries', rpcArgs(params))

  if (error) {
    throw error
  }

  return data.map(toEntry)
}

/** fact and plan sums of each day with entries, in the base currency, for exactly the entries of the same filter */
export async function listCalendarDayTotals(supabase: SaldoClient, params: CalendarParams): Promise<DayTotals[]> {
  const { data, error } = await supabase.rpc('calendar_day_totals', rpcArgs(params))

  if (error) {
    throw error
  }

  return data.map(toDayTotals)
}

/** the space's own filter sets; a malformed one turns into «everything» instead of breaking the screen */
export async function listSavedFilters(supabase: SaldoClient, ledgerId: string): Promise<SavedFilter[]> {
  const { data, error } = await supabase
    .from('calendar_saved_filters')
    .select('id, name, filter')
    .eq('ledger_id', ledgerId)
    .order('created_at')

  if (error) {
    throw error
  }

  return data.map((row) => ({
    id: row.id,
    name: row.name,
    filter: calendarFilterSchema.catch({}).parse(row.filter),
  }))
}

/** a new set; the client id makes a retried save land once */
export async function saveCalendarFilter(supabase: SaldoClient, input: SavedFilter & { ledgerId: string }) {
  const { error } = await supabase.from('calendar_saved_filters').upsert(
    {
      id: input.id,
      ledger_id: input.ledgerId,
      name: input.name.trim(),
      filter: input.filter as { [key: string]: Json | undefined },
    },
    { ignoreDuplicates: true },
  )

  if (error) {
    throw error
  }
}

/** pick lists of the filter sheet, archived ones included: old entries still point at them */
export async function listCalendarOptions(supabase: SaldoClient, ledgerId: string) {
  const [accounts, categories] = await Promise.all([
    listAccountOptions(supabase, ledgerId),
    listCategoryOptions(supabase, ledgerId),
  ])

  return {
    accounts,
    categories,
  }
}

type CancelPlanInput = {
  ledgerId: string
  obligationId: string
}

/** «Remove the entry» of a plan with no payment: the occurrence leaves the calendar, Upcoming and «Available» (§18); the
 * source (a subscription, a series) stays. Idempotent, so a retry from the device queue is safe. */
export async function cancelPlanEntry(supabase: SaldoClient, input: CancelPlanInput) {
  const { error } = await supabase
    .from('obligations')
    .update({ lifecycle: 'cancelled' })
    .eq('id', input.obligationId)
    .eq('ledger_id', input.ledgerId)
    .eq('lifecycle', 'active')

  if (error) {
    throw error
  }
}
