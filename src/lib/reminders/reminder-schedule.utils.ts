import { format, parseISO, subDays } from 'date-fns'

type NextReminderInput = {
  /** YYYY-MM-DD due dates of the source's unpaid payments */
  dueDates: string[]
  offsetsDays: number[]
  /** HH:mm */
  atTime: string
  /** the space's today (YYYY-MM-DD) and now (HH:mm) */
  today: string
  nowTime: string
}

export type NextReminder = {
  /** YYYY-MM-DD */
  date: string
  /** HH:mm */
  time: string
}

/** the first reminder that has not fired yet: a due date minus an offset, at the rule's time; null when none is left */
export function nextReminder(input: NextReminderInput): NextReminder | null {
  const now = `${input.today}T${input.nowTime}`
  const fires = input.dueDates
    .flatMap((dueOn) => input.offsetsDays.map((days) => format(subDays(parseISO(dueOn), days), 'yyyy-MM-dd')))
    .filter((date) => `${date}T${input.atTime}` > now)
    .sort()

  return fires.length === 0
    ? null
    : {
        date: fires[0],
        time: input.atTime,
      }
}
