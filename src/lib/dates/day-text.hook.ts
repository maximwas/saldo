import { useFormatter, useLocale } from 'next-intl'
import { type DayFormat, formatDay, monthOf } from '@/lib/dates/day.utils'

/** a calendar day (YYYY-MM-DD) or a month (YYYY-MM) as text: dayText('2026-11-03', 'short') → «03.11» */
export function useDayText() {
  const formatter = useFormatter()

  return (day: string, dayFormat: DayFormat) => formatDay(formatter, day, dayFormat)
}

/** the month of a day or a month as it follows a day number (the Ukrainian genitive): «from November» */
export function useMonthOf() {
  const locale = useLocale()

  return (day: string) => monthOf(locale, day)
}
