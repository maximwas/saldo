import { TZDate, tz } from '@date-fns/tz'
import { format } from 'date-fns'

/** what pure code needs from ClockProvider: the ledger time zone and the current moment */
export type Clock = {
  timeZone: string
  now: () => Date
}

/** YYYY-MM-DD of the moment in the time zone */
export const localDate = (moment: Date, timeZone: string) => format(moment, 'yyyy-MM-dd', { in: tz(timeZone) })

/** HH:mm of the moment in the time zone */
export const localTime = (moment: Date, timeZone: string) => format(moment, 'HH:mm', { in: tz(timeZone) })

/**
 * occurred_at for a picked date and an optional HH:mm time: that local time when given, else now when the date is
 * today, else local noon (no DST edge can move it to another day)
 */
export function toOccurredAt(occurredOn: string, clock: Clock, time?: string): string {
  const now = clock.now()
  const [year, month, day] = occurredOn.split('-').map(Number)

  if (time) {
    const [hours, minutes] = time.split(':').map(Number)

    return new Date(TZDate.tz(clock.timeZone, year, month - 1, day, hours, minutes).getTime()).toISOString()
  }

  if (occurredOn === localDate(now, clock.timeZone)) {
    return now.toISOString()
  }

  return new Date(TZDate.tz(clock.timeZone, year, month - 1, day, 12).getTime()).toISOString()
}
