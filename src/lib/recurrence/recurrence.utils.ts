import { tz } from '@date-fns/tz'
import { addDays, addMonths, addYears, format, getDate, parseISO } from 'date-fns'

/** interval_unit of a series; a weekly series is 7 days */
export type RecurrenceUnit = 'day' | 'month' | 'year'

/** what a monthly or yearly series does when its day (29–31, 29 February) is missing from a month */
export type ShortMonthRule = 'last_day' | 'next_month_first' | 'skip'

export type Series = {
  unit: RecurrenceUnit
  /** every `count` units, a positive integer */
  count: number
  /** YYYY-MM-DD: the first occurrence and the day every later one aims for */
  firstOn: string
  /** last_day when omitted, like the column default */
  shortMonthRule?: ShortMonthRule
}

export type OccurrenceWindow = Series & {
  /** YYYY-MM-DD, inclusive */
  from: string
  /** YYYY-MM-DD, inclusive */
  until: string
}

// series dates are calendar days: the math runs in UTC, so neither DST nor the process zone can move a day
const utc = tz('UTC')

const STEP: Record<RecurrenceUnit, (start: Date, amount: number) => Date> = {
  day: (start, amount) => addDays(start, amount, { in: utc }),
  month: (start, amount) => addMonths(start, amount, { in: utc }),
  year: (start, amount) => addYears(start, amount, { in: utc }),
}

/** date-fns clamps a missing day to the last day of the month; every rule starts from that clamped date */
const SHORT_MONTH: Record<ShortMonthRule, (clamped: Date) => Date | null> = {
  last_day: (clamped) => clamped,
  next_month_first: (clamped) => addDays(clamped, 1, { in: utc }),
  skip: () => null,
}

/** the date of period `index` (0 = firstOn), counted from the start so a short month never shifts later ones */
function occurrenceAt(series: Series, start: Date, index: number): Date | null {
  const stepped = STEP[series.unit](start, index * series.count)

  if (series.unit === 'day' || getDate(stepped) === getDate(start)) {
    return stepped
  }

  return SHORT_MONTH[series.shortMonthRule ?? 'last_day'](stepped)
}

/** every date of the series in order, without end */
function* occurrences(series: Series): Generator<string> {
  if (!Number.isInteger(series.count) || series.count <= 0) {
    throw new RangeError(`series count must be a positive integer, got ${series.count}`)
  }

  const start = parseISO(series.firstOn, { in: utc })

  for (let index = 0; ; index += 1) {
    const date = occurrenceAt(series, start, index)

    if (date) {
      yield format(date, 'yyyy-MM-dd')
    }
  }
}

/** the dates of a series between `from` and `until`, both inclusive (YYYY-MM-DD) */
export function generateOccurrences({ from, until, ...series }: OccurrenceWindow): string[] {
  const dates: string[] = []

  for (const date of occurrences(series)) {
    if (date > until) {
      break
    }

    if (date >= from) {
      dates.push(date)
    }
  }

  return dates
}

/** the first `limit` dates of a series, e.g. the N installments of a credit */
export function takeOccurrences(series: Series, limit: number): string[] {
  const dates: string[] = []

  for (const date of occurrences(series)) {
    if (dates.length >= limit) {
      break
    }

    dates.push(date)
  }

  return dates
}
