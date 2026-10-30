import { useFormatter } from 'next-intl'

/** a ledger calendar date (YYYY-MM-DD) as dd.MM or dd.MM.yyyy; read at noon UTC so no zone moves the day */
export function useDateLabel() {
  const format = useFormatter()

  return (date: string, withYear = false) =>
    format.dateTime(new Date(`${date}T12:00:00Z`), {
      timeZone: 'UTC',
      day: '2-digit',
      month: '2-digit',
      year: withYear ? 'numeric' : undefined,
    })
}
