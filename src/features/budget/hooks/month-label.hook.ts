import { useFormatter, useLocale } from 'next-intl'

/** "October 2026" (or just "October") for a YYYY-MM month; read at noon UTC so no zone moves the month */
export function useMonthLabel() {
  const format = useFormatter()

  return (month: string, withYear = true) =>
    format.dateTime(new Date(`${month}-01T12:00:00Z`), {
      timeZone: 'UTC',
      month: 'long',
      year: withYear ? 'numeric' : undefined,
    })
}

/** the month as it follows «from» in Ukrainian (genitive): the month part of a formatted day, which declines it */
export function useMonthOf() {
  const locale = useLocale()

  return (month: string) =>
    new Intl.DateTimeFormat(locale, {
      timeZone: 'UTC',
      day: 'numeric',
      month: 'long',
    })
      .formatToParts(new Date(`${month}-01T12:00:00Z`))
      .find((part) => part.type === 'month')?.value ?? month
}
