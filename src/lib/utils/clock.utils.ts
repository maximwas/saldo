import { TZDate, tz } from '@date-fns/tz'
import { format } from 'date-fns'

/** what pure code needs from ClockProvider: the ledger time zone and the current moment */
export type Clock = {
  timeZone: string
  now: () => Date
}

/** YYYY-MM-DD of the moment in the time zone */
export const localDate = (moment: Date, timeZone: string) => format(moment, 'yyyy-MM-dd', { in: tz(timeZone) })

/** occurred_at for a picked date: now when it is today, else local noon (no DST edge can move it to another day) */
export function toOccurredAt(occurredOn: string, clock: Clock): string {
  const now = clock.now()

  if (occurredOn === localDate(now, clock.timeZone)) {
    return now.toISOString()
  }

  const [year, month, day] = occurredOn.split('-').map(Number)

  return new Date(TZDate.tz(clock.timeZone, year, month - 1, day, 12).getTime()).toISOString()
}
