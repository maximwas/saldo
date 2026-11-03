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

export type TotalLine = {
  key: 'spent' | 'received' | 'planned' | 'expected'
  minor: number
  kind: 'fact' | 'income' | 'plan'
}

/** the labelled sums of a day (Figma 51:126307, 57:128491): «Spent» and «Received» already happened, «Planned» and
 * «Expected» are still to come; a sum of zero is left out, so an empty day says nothing */
export function dayTotalLines(totals: DayTotals | undefined): TotalLine[] {
  if (!totals) {
    return []
  }

  const lines: TotalLine[] = [
    {
      key: 'spent',
      minor: -totals.factExpenseMinor,
      kind: 'fact',
    },
    {
      key: 'received',
      minor: totals.factIncomeMinor,
      kind: 'income',
    },
    {
      key: 'planned',
      minor: -totals.planOutMinor,
      kind: 'plan',
    },
    {
      key: 'expected',
      minor: totals.planInMinor,
      kind: 'plan',
    },
  ]

  return lines.filter((line) => line.minor !== 0)
}

type ToneFields = {
  kind: string
  sourceType: string | null
}

/** the mark colour of an entry (Figma «Calendar» 51:126598 «Colour is the kind of entry»): its source first, otherwise
 * its kind, as a text colour so a mark paints it filled (bg-current) or outlined (border-current). A plain expense
 * (a manual plan without a category too) takes the primary mark: grey is «paid earlier» on phones (Figma 59:129601). */
export const LEGEND = [
  ['expense', 'text-primary'],
  ['income', 'text-positive'],
  ['transfer', 'text-border-strong'],
  ['subscription', 'text-primary'],
  ['credit', 'text-cat-orange'],
  ['debt', 'text-cat-pink'],
  ['big_expense', 'text-cat-cyan'],
  ['auto_plan', 'text-cat-teal'],
  ['tax', 'text-cat-yellow'],
] as const

const TONE: Record<string, string> = Object.fromEntries(LEGEND)
const KIND_GROUP: Record<string, string> = {
  income: 'income',
  transfer_out: 'transfer',
  debt_in: 'debt',
  debt_out: 'debt',
}

const toneKey = ({ kind, sourceType }: ToneFields) =>
  sourceType && sourceType in TONE ? sourceType : (KIND_GROUP[kind] ?? 'expense')

export const entryTone = (entry: ToneFields) => TONE[toneKey(entry)] ?? TONE.expense

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

/** a month cell lists this many entries; the rest is one quiet «more N» line that opens the day (Figma 55:127515) */
const CELL_LINES = 3

export function cellLines<Item>(items: Item[], max = CELL_LINES) {
  return {
    shown: items.slice(0, max),
    more: Math.max(items.length - max, 0),
  }
}

/** the dates a view reads, as periodRange gives them */
type Period = ReturnType<typeof periodRange>

type StatusFields = {
  entry: 'fact' | 'plan'
  day: string
  state: string
  obligationId: string | null
  plannedOn: string | null
}

const paidElsewhere = (entry: StatusFields) =>
  entry.entry === 'fact' && entry.obligationId !== null && entry.plannedOn !== null && entry.plannedOn !== entry.day

/** a plan paid on another day leaves a greyed «Paid DD.MM» mark on its own day (Figma 55:127515): the facts that paid
 * a plan of another day, by that plan's day, for the plan days of the period only. The money still counts on the pay
 * day only. */
export function paidMarks<Entry extends StatusFields>(entries: Entry[], period: Period) {
  const byPlanDay = new Map<string, Entry[]>()

  for (const entry of entries.filter(paidElsewhere)) {
    const day = entry.plannedOn ?? entry.day

    if (day >= period.from && day <= period.to) {
      byPlanDay.set(day, [...(byPlanDay.get(day) ?? []), entry])
    }
  }

  return byPlanDay
}

/** the days outside [from, to] that a read of the period still needs, once each and in order */
export const outsideDays = (days: string[], period: Period) =>
  [...new Set(days.filter((day) => day < period.from || day > period.to))].sort()

export type EntryStatus = 'planned' | 'partial' | 'overdue' | 'paid' | 'paidElsewhere' | 'fact'

const PLAN_STATUS: Record<string, EntryStatus> = {
  partial: 'partial',
  unconfirmed: 'overdue',
}

/** what a row's second line and the popup say: a plan still waits (partly paid, its date passed), a fact paid a plan
 * on the plan's day or on another one, or it is a plain operation */
export function entryStatus(entry: StatusFields): EntryStatus {
  if (entry.entry === 'plan') {
    return PLAN_STATUS[entry.state] ?? 'planned'
  }

  if (entry.obligationId === null) {
    return 'fact'
  }

  return paidElsewhere(entry) ? 'paidElsewhere' : 'paid'
}
