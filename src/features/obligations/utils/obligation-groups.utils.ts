import { addDays, format, parseISO } from 'date-fns'

export type ObligationBucket = 'overdue' | 'today' | 'week' | 'later'

export const BUCKETS: readonly ObligationBucket[] = ['overdue', 'today', 'week', 'later']

const WEEK_DAYS = 7

/** YYYY-MM-DD plus days: calendar arithmetic of date-fns on a local-midnight date, so DST cannot move the day */
export const addDaysIso = (isoDate: string, days: number) => format(addDays(parseISO(isoDate), days), 'yyyy-MM-dd')

/**
 * §7 groups by due date against «today» in the ledger time zone: a past date is never «paid» or «overdue» fact,
 * only «date passed, not confirmed»; «next 7 days» is tomorrow through today + 7.
 */
export function groupByBucket<Row extends { dueOn: string }>(
  rows: readonly Row[],
  today: string,
): Record<ObligationBucket, Row[]> {
  const weekEnd = addDaysIso(today, WEEK_DAYS)
  const groups: Record<ObligationBucket, Row[]> = {
    overdue: [],
    today: [],
    week: [],
    later: [],
  }

  for (const row of [...rows].sort((first, second) => first.dueOn.localeCompare(second.dueOn))) {
    const bucket: ObligationBucket =
      row.dueOn < today ? 'overdue' : row.dueOn === today ? 'today' : row.dueOn <= weekEnd ? 'week' : 'later'

    groups[bucket].push(row)
  }

  return groups
}
