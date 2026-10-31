import { addMonths, endOfMonth, format, parse } from 'date-fns'
import { parseAsString, parseAsStringLiteral } from 'nuqs'
import { ADD_KINDS, OPERATION_TYPES, type OperationFilters, type OperationType } from '../operations.types'

/** `period` value of «all time»; a missing `period` means the current month */
export const ALL_TIME = 'all'

const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/
const DAY_FORMAT = 'yyyy-MM-dd'

/** the URL vocabulary of the list: ?period=2026-10|all&account=<id>&category=<id>&type=expense&q=<text> */
export const operationFilterParsers = {
  period: parseAsString,
  account: parseAsString,
  category: parseAsString,
  who: parseAsString,
  type: parseAsStringLiteral(OPERATION_TYPES).withDefault('all'),
  q: parseAsString,
}

export const addKindParser = parseAsStringLiteral(ADD_KINDS)

type UrlFilters = {
  period: string | null
  account: string | null
  category: string | null
  who: string | null
  type: OperationType
  q: string | null
}

const monthOf = (day: string) => day.slice(0, 7)

/** the period the list shows: a valid YYYY-MM, «all», or the month of `today` when the URL has nothing usable */
export function periodValue(period: string | null, today: string): string {
  if (period === ALL_TIME || (period !== null && MONTH.test(period))) {
    return period
  }

  return monthOf(today)
}

/** the last `count` months, newest first, as YYYY-MM */
export function recentMonths(today: string, count: number): string[] {
  const start = parse(`${monthOf(today)}-01`, DAY_FORMAT, new Date())

  return Array.from({ length: count }, (_, index) => format(addMonths(start, -index), 'yyyy-MM'))
}

export function resolveFilters(url: UrlFilters, today: string): OperationFilters {
  const period = periodValue(url.period, today)
  const month = period === ALL_TIME ? null : parse(`${period}-01`, DAY_FORMAT, new Date())

  return {
    from: month ? format(month, DAY_FORMAT) : null,
    to: month ? format(endOfMonth(month), DAY_FORMAT) : null,
    accountId: url.account,
    categoryId: url.category,
    createdBy: url.who,
    type: url.type,
    text: url.q?.trim() || null,
  }
}

/**
 * PostgREST `or` filter for the «Text» chip: the payee or the note contains the text. LIKE wildcards in the text are
 * literal (backslash-escaped), and the value is double-quoted so commas and brackets do not split the filter.
 */
export function textFilter(text: string): string {
  const like = `%${text.replace(/[\\%_]/g, (char) => `\\${char}`)}%`
  const quoted = `"${like.replace(/[\\"]/g, (char) => `\\${char}`)}"`

  return `counterparty.ilike.${quoted},note.ilike.${quoted}`
}

/** a filter other than the default «this month, everything» is on: the empty state then offers a reset */
export const hasActiveFilters = (url: UrlFilters) =>
  url.period !== null ||
  url.account !== null ||
  url.category !== null ||
  url.who !== null ||
  url.q !== null ||
  url.type !== 'all'
