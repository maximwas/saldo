import { type inferParserType, parseAsArrayOf, parseAsInteger, parseAsString, parseAsStringLiteral } from 'nuqs'
import { z } from 'zod'

/**
 * The calendar filter in the URL uses the keys of calendar_entries' p_filter one to one (?entry=fact&kinds=expense),
 * so the URL, a quick set, a saved set (calendar_saved_filters.filter) and the RPC argument are the same object.
 */
export const filterParsers = {
  entry: parseAsStringLiteral(['fact', 'plan'] as const),
  kinds: parseAsArrayOf(parseAsString),
  direction: parseAsStringLiteral(['in', 'out'] as const),
  states: parseAsArrayOf(parseAsString),
  source_types: parseAsArrayOf(parseAsString),
  source_id: parseAsString,
  category_ids: parseAsArrayOf(parseAsString),
  account_ids: parseAsArrayOf(parseAsString),
  currencies: parseAsArrayOf(parseAsString),
  min_amount_minor: parseAsInteger,
  max_amount_minor: parseAsInteger,
  q: parseAsString,
}

export type UrlFilter = inferParserType<typeof filterParsers>

const FILTER_KEYS = Object.keys(filterParsers) as (keyof UrlFilter)[]

/** a saved set comes from the database: anything else than this shape is dropped, never sent to the RPC */
export const calendarFilterSchema = z
  .object({
    entry: z.enum(['fact', 'plan']),
    kinds: z.array(z.string()),
    direction: z.enum(['in', 'out']),
    states: z.array(z.string()),
    source_types: z.array(z.string()),
    source_id: z.string(),
    category_ids: z.array(z.string()),
    account_ids: z.array(z.string()),
    currencies: z.array(z.string()),
    min_amount_minor: z.int(),
    max_amount_minor: z.int(),
    q: z.string(),
  })
  .partial()

export type CalendarFilter = z.infer<typeof calendarFilterSchema>

/** what the type chips set; the rest (search, category, account, currency, amount, source) refines any of them */
const TYPE_KEYS = ['entry', 'kinds', 'direction', 'states', 'source_types'] as const

export const QUICK_SETS = [
  {
    key: 'all',
    filter: {},
  },
  {
    key: 'expenses',
    filter: {
      entry: 'fact',
      kinds: ['expense'],
    },
  },
  {
    key: 'income',
    filter: { kinds: ['income'] },
  },
  {
    key: 'due',
    filter: {
      entry: 'plan',
      direction: 'out',
      states: ['plan', 'partial', 'unconfirmed'],
    },
  },
  {
    key: 'subscriptions',
    filter: { source_types: ['subscription'] },
  },
  {
    key: 'credits',
    filter: { source_types: ['credit'] },
  },
  {
    key: 'auto',
    filter: { source_types: ['auto_plan'] },
  },
  {
    key: 'taxes',
    filter: { source_types: ['tax'] },
  },
] as const satisfies readonly {
  key: string
  filter: CalendarFilter
}[]

const isSet = (value: unknown) =>
  value !== null && value !== undefined && value !== '' && !(Array.isArray(value) && value.length === 0)

/** the URL values that are set, as the RPC's p_filter */
export const toFilter = (url: Partial<UrlFilter>): CalendarFilter =>
  Object.fromEntries(Object.entries(url).filter(([key, value]) => key in filterParsers && isSet(value)))

/** every filter key of the URL: set from the filter, cleared otherwise */
export const fromFilter = (filter: CalendarFilter): UrlFilter =>
  Object.fromEntries(FILTER_KEYS.map((key) => [key, filter[key] ?? null])) as UrlFilter

/** the type keys of a quick set; the refinements in the URL stay */
export const typeKeysOf = (filter: CalendarFilter): Partial<UrlFilter> =>
  Object.fromEntries(TYPE_KEYS.map((key) => [key, filter[key] ?? null]))

const stable = (filter: CalendarFilter) => JSON.stringify(Object.entries(toFilter(filter)).sort())

export const sameFilter = (first: CalendarFilter, second: CalendarFilter) => stable(first) === stable(second)

/** the quick set whose type keys the URL holds; null = a custom combination */
export function activeQuickSet(filter: CalendarFilter) {
  const types = toFilter(typeKeysOf(filter))

  return QUICK_SETS.find((set) => sameFilter(types, set.filter))?.key ?? null
}

/** the keys that are on and not shown by an active quick set chip: they get chips of their own */
export function activeChips(filter: CalendarFilter) {
  const covered: readonly string[] = activeQuickSet(filter) === null ? [] : TYPE_KEYS

  return Object.keys(filter).filter((key) => !covered.includes(key)) as (keyof UrlFilter)[]
}
