import {
  addDays,
  addMonths,
  addWeeks,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isValid,
  parseISO,
  startOfMonth,
  startOfWeek,
} from 'date-fns'

export const CALENDAR_VIEWS = ['month', 'week', 'day', 'list'] as const
export type CalendarView = (typeof CALENDAR_VIEWS)[number]

const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const WEEK = { weekStartsOn: 1 } as const
// local midnight in and out: a date-only value never meets a time zone
const iso = (date: Date) => format(date, 'yyyy-MM-dd')

/** noon UTC of a YYYY-MM-DD: format it with timeZone 'UTC' and no zone moves the day */
export const dayDate = (day: string) => new Date(`${day}T12:00:00Z`)

export const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1)

/** rows by their day, in the order they came (calendar_entries returns them by day) */
export function groupByDay<Row extends { day: string }>(rows: Row[]) {
  const byDay = new Map<string, Row[]>()

  for (const row of rows) {
    byDay.set(row.day, [...(byDay.get(row.day) ?? []), row])
  }

  return byDay
}

type SignedFields = {
  amountMinor: number | null
  direction: string | null
}

/** what leaves the space is negative, as everywhere in the app; an unknown amount stays null */
export const signedMinor = ({ amountMinor, direction }: SignedFields) =>
  amountMinor !== null && direction === 'out' ? -amountMinor : amountMinor

/** a YYYY-MM-DD from the URL, or null when it is not a real day */
export const validDay = (value: string | null) =>
  value !== null && DAY_PATTERN.test(value) && isValid(parseISO(value)) ? value : null

/** the dates a view reads: the month for month and list, Monday to Sunday for week, the day itself for day */
export function periodRange(view: CalendarView, day: string) {
  const date = parseISO(day)

  if (view === 'week') {
    return {
      from: iso(startOfWeek(date, WEEK)),
      to: iso(endOfWeek(date, WEEK)),
    }
  }

  if (view === 'day') {
    return {
      from: day,
      to: day,
    }
  }

  return {
    from: iso(startOfMonth(date)),
    to: iso(endOfMonth(date)),
  }
}

/** whole weeks, Monday first, from the week of the 1st to the week of the last day */
export function monthGrid(day: string) {
  const date = parseISO(day)

  return eachDayOfInterval({
    start: startOfWeek(startOfMonth(date), WEEK),
    end: endOfWeek(endOfMonth(date), WEEK),
  }).map(iso)
}

export function weekDays(day: string) {
  const { from, to } = periodRange('week', day)

  return eachDayOfInterval({
    start: parseISO(from),
    end: parseISO(to),
  }).map(iso)
}

const STEP = {
  month: addMonths,
  list: addMonths,
  week: addWeeks,
  day: addDays,
}

/** the previous or next month / week / day of a view */
export const shiftDay = (view: CalendarView, day: string, step: 1 | -1) => iso(STEP[view](parseISO(day), step))

export type DayTotals = {
  day: string
  factIncomeMinor: number
  factExpenseMinor: number
  planInMinor: number
  planOutMinor: number
  unknownCount: number
  entriesCount: number
}

/** the period line over the calendar: the sum of the days calendar_day_totals returned for the same filter */
export function sumTotals(days: DayTotals[]) {
  const sum = (pick: (day: DayTotals) => number) => days.reduce((total, day) => total + pick(day), 0)
  const incomeMinor = sum((day) => day.factIncomeMinor)
  const expenseMinor = sum((day) => day.factExpenseMinor)

  return {
    incomeMinor,
    expenseMinor,
    resultMinor: incomeMinor - expenseMinor,
    planMinor: sum((day) => day.planInMinor - day.planOutMinor),
    unknownCount: sum((day) => day.unknownCount),
    entriesCount: sum((day) => day.entriesCount),
  }
}

type ToneFields = {
  kind: string
  sourceType: string | null
}

/** legend colour of an entry (Figma «Calendar» legend 2:67113): its source first, otherwise its kind; a plan draws the
 * marker as an outline (border class), a fact fills it (bg class) */
export const LEGEND = [
  ['expense', 'bg-neutral', 'border-neutral'],
  ['income', 'bg-positive', 'border-positive'],
  ['transfer', 'bg-border-strong', 'border-border-strong'],
  ['subscription', 'bg-primary', 'border-primary'],
  ['credit', 'bg-cat-orange', 'border-cat-orange'],
  ['debt', 'bg-cat-pink', 'border-cat-pink'],
  ['big_expense', 'bg-cat-cyan', 'border-cat-cyan'],
  ['auto_plan', 'bg-cat-teal', 'border-cat-teal'],
  ['tax', 'bg-cat-yellow', 'border-cat-yellow'],
] as const

const TONE: Record<string, string> = Object.fromEntries(LEGEND.map(([key, fill]) => [key, fill]))
const OUTLINE: Record<string, string> = Object.fromEntries(LEGEND.map(([key, , outline]) => [key, outline]))
const KIND_GROUP: Record<string, string> = {
  income: 'income',
  transfer_out: 'transfer',
  debt_in: 'debt',
  debt_out: 'debt',
}

const toneKey = ({ kind, sourceType }: ToneFields) =>
  sourceType && sourceType in TONE ? sourceType : (KIND_GROUP[kind] ?? 'expense')

export const entryTone = (entry: ToneFields) => TONE[toneKey(entry)] ?? TONE.expense

export const entryOutline = (entry: ToneFields) => OUTLINE[toneKey(entry)] ?? OUTLINE.expense

const SOURCE_HREF: Record<string, (sourceId: string) => string> = {
  subscription: (sourceId) => `/payments/subscriptions?sub=${sourceId}`,
  credit: (sourceId) => `/payments/credits/${sourceId}`,
  debt: () => '/payments/debts',
}

/** «Open the source»: the subscription or credit card, the debts list, otherwise «Upcoming»; null = no source */
export function sourceHref(sourceType: string | null, sourceId: string | null) {
  if (sourceType === null) {
    return null
  }

  const href = sourceId ? SOURCE_HREF[sourceType] : undefined

  return href && sourceId ? href(sourceId) : '/payments'
}
