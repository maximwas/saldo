import { useFormatter } from 'next-intl'

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
