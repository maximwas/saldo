import type { createFormatter, DateTimeFormatOptions } from 'next-intl'

/** what formatDay needs from next-intl: useFormatter() in components, createFormatter() elsewhere */
type DateFormatter = Pick<ReturnType<typeof createFormatter>, 'dateTime'>

/**
 * A calendar day (YYYY-MM-DD, or YYYY-MM for the first day of the month) as noon UTC. Formatted in UTC it is the same
 * day in any zone of the browser or the space: the one anchor rule for turning a day into text.
 */
export function dayToDate(day: string): Date {
  const [year, month, date = 1] = day.split('-').map(Number)

  return new Date(Date.UTC(year, month - 1, date, 12))
}

/** the day formats the interface shows; the examples are 2026-11-03 in English */
const DAY_FORMATS = {
  /** 11/03 */
  short: {
    day: '2-digit',
    month: '2-digit',
  },
  /** 11/03/2026 */
  shortYear: {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  },
  /** November 3 */
  dayMonth: {
    day: 'numeric',
    month: 'long',
  },
  /** November 3, 2026 */
  dayMonthYear: {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  },
  /** Nov 3 */
  dayMonthShort: {
    day: 'numeric',
    month: 'short',
  },
  /** Nov 3, 2026 */
  dayMonthShortYear: {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  },
  /** Tuesday */
  weekday: { weekday: 'long' },
  /** Tue */
  weekdayShort: { weekday: 'short' },
  /** Tuesday, November 3 */
  weekdayDayMonth: {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  },
  /** November */
  month: { month: 'long' },
  /** Nov */
  monthShort: { month: 'short' },
  /** November 2026 */
  monthYear: {
    month: 'long',
    year: 'numeric',
  },
  /** 2026 */
  year: { year: 'numeric' },
} as const satisfies Record<string, DateTimeFormatOptions>

export type DayFormat = keyof typeof DAY_FORMATS

/** a calendar day (or a YYYY-MM month) as text in one of DAY_FORMATS */
export function formatDay(formatter: DateFormatter, day: string, dayFormat: DayFormat): string {
  return formatter.dateTime(dayToDate(day), {
    ...DAY_FORMATS[dayFormat],
    timeZone: 'UTC',
  })
}

/** the month of a day as it follows a day number, which in Ukrainian is the genitive the day-month format declines */
export function monthOf(locale: string, day: string): string {
  return (
    new Intl.DateTimeFormat(locale, {
      day: 'numeric',
      month: 'long',
      timeZone: 'UTC',
    })
      .formatToParts(dayToDate(day))
      .find((part) => part.type === 'month')?.value ?? ''
  )
}
