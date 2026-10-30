import { addMonths, endOfMonth, endOfYear, format, parse, startOfMonth } from 'date-fns'

export const BUCKETS = ['day', 'week', 'month', 'year'] as const
export type Bucket = (typeof BUCKETS)[number]

export const VIEWS = ['chart', 'table'] as const

export type PeriodRange = {
  from: string
  to: string
  /** the grouping that reads best for this range */
  bucket: Bucket
}

const DAY = 'yyyy-MM-dd'
const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/
const YEAR = /^\d{4}$/
/** `?period=3m|6m|12m`: that many months ending with the current one */
const ROLLING: Record<string, number> = {
  '3m': 3,
  '6m': 6,
  '12m': 12,
}

export const isRolling = (period: string) => Object.hasOwn(ROLLING, period)

/** a valid month (YYYY-MM), year (YYYY) or rolling value from the URL, else the month of `today` */
export function periodValue(period: string | null, today: string): string {
  if (period !== null && (MONTH.test(period) || YEAR.test(period) || isRolling(period))) {
    return period
  }

  return today.slice(0, 7)
}

export function resolvePeriod(period: string, today: string): PeriodRange {
  if (isRolling(period)) {
    const thisMonth = startOfMonth(parse(today, DAY, new Date()))

    return {
      from: format(addMonths(thisMonth, 1 - ROLLING[period]), DAY),
      to: format(endOfMonth(thisMonth), DAY),
      bucket: 'month',
    }
  }

  if (YEAR.test(period)) {
    const first = parse(`${period}-01-01`, DAY, new Date())

    return {
      from: format(first, DAY),
      to: format(endOfYear(first), DAY),
      bucket: 'month',
    }
  }

  const first = parse(`${period}-01`, DAY, new Date())

  return {
    from: format(first, DAY),
    to: format(endOfMonth(first), DAY),
    bucket: 'week',
  }
}

/** the period options: the last 12 months, then the rolling ranges and the current year */
export function periodOptions(today: string): string[] {
  const thisMonth = startOfMonth(parse(today, DAY, new Date()))
  const months = Array.from({ length: 12 }, (_, index) => format(addMonths(thisMonth, -index), 'yyyy-MM'))

  return [...months, ...Object.keys(ROLLING), today.slice(0, 4)]
}

/** the three months after the current one: the forecast of entered schedules */
export function forecastRange(today: string): {
  from: string
  to: string
  months: string[]
} {
  const thisMonth = startOfMonth(parse(today, DAY, new Date()))
  const next = addMonths(thisMonth, 1)

  return {
    from: format(next, DAY),
    to: format(endOfMonth(addMonths(thisMonth, 3)), DAY),
    months: [1, 2, 3].map((offset) => format(addMonths(thisMonth, offset), 'yyyy-MM')),
  }
}

/** the list of operations has a month filter only: an exact month is linked as is, any wider range as «all time» */
export const linkPeriod = (period: string) => (MONTH.test(period) ? period : 'all')

/** the month a bucket starts in; a year bucket has no month filter, so it opens all time */
export const bucketPeriod = (bucket: Bucket, periodStart: string) =>
  bucket === 'year' ? 'all' : periodStart.slice(0, 7)

type OperationsLink = {
  period: string
  category?: string | null
  who?: string | null
  type?: 'income' | 'expense'
}

export function operationsHref({ period, category, who, type }: OperationsLink): string {
  const params = new URLSearchParams({ period })

  for (const [key, value] of Object.entries({
    category,
    who,
    type,
  })) {
    if (value) {
      params.set(key, value)
    }
  }

  return `/operations?${params}`
}
