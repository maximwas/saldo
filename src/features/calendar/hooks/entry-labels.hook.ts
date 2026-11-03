import { type DateTimeFormatOptions, useFormatter, useTranslations } from 'next-intl'
import { useMoneyText } from '@/components/ui/amount.component'
import { useToday } from '@/contexts/clock.context'
import type { CalendarEntry } from '../api/calendar.api'
import { capitalize, dayDate, type EntryStatus, entryStatus } from '../utils/calendar.utils'
import { useCalendarOptions } from './calendar.hook'

/** «03.11» of a YYYY-MM-DD */
export function useShortDate() {
  const format = useFormatter()

  return (day: string) =>
    format.dateTime(dayDate(day), {
      timeZone: 'UTC',
      day: '2-digit',
      month: '2-digit',
    })
}

/** the title of a day: «Today, Tuesday 3 November» or «Wednesday, 4 November» */
export function useDayTitle() {
  const translate = useTranslations('calendar')
  const format = useFormatter()
  const today = useToday()
  const part = (day: string, options: DateTimeFormatOptions) =>
    format.dateTime(dayDate(day), {
      timeZone: 'UTC',
      ...options,
    })

  return (day: string) =>
    day === today
      ? translate('day.today', {
          weekday: part(day, { weekday: 'long' }),
          date: part(day, {
            day: 'numeric',
            month: 'long',
          }),
        })
      : capitalize(
          part(day, {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
          }),
        )
}

/** what an entry is: its source («Credit», «Planned payment») or else its kind («Expense», «Transfer») */
export function useEntryType() {
  const translate = useTranslations('calendar')

  return (entry: CalendarEntry) =>
    entry.sourceType
      ? translate(`source.${entry.sourceType as 'manual'}`)
      : translate(`kind.${entry.kind as 'expense'}`)
}

/** the state words: «not paid yet», «paid today, the plan was for 05.11»; a plain operation names its account */
function useStatusWords() {
  const translate = useTranslations('calendar')
  const moneyText = useMoneyText()
  const today = useToday()
  const short = useShortDate()
  const accounts = useCalendarOptions().data?.accounts
  const paidOn = (entry: CalendarEntry) => ({
    today: entry.day === today ? 'yes' : 'no',
    date: short(entry.day),
  })
  const words: Record<EntryStatus, (entry: CalendarEntry) => string> = {
    planned: () => translate('status.planned'),
    partial: (entry) =>
      translate('status.partial', {
        paid: moneyText(entry.paidMinor, entry.currency),
        planned: moneyText(entry.plannedAmountMinor, entry.currency),
      }),
    overdue: () => translate('status.overdue'),
    paid: (entry) => translate('status.paid', paidOn(entry)),
    paidElsewhere: (entry) =>
      translate('status.paidElsewhere', {
        ...paidOn(entry),
        planned: short(entry.plannedOn ?? entry.day),
      }),
    fact: (entry) => accounts?.find((account) => account.id === entry.accountId)?.name ?? '',
  }

  // the plan day's mark of a payment made on another day only says when it was paid
  return (entry: CalendarEntry, mark = false) => words[mark ? 'paid' : entryStatus(entry)](entry)
}

/** a row's second line: «Credit · paid today, the plan was for 05.11», «Planned payment · not paid yet» */
export function useEntryLine() {
  const translate = useTranslations('calendar')
  const type = useEntryType()
  const words = useStatusWords()

  return (entry: CalendarEntry, mark = false) => {
    const status = words(entry, mark)

    return status
      ? translate('status.line', {
          type: type(entry),
          status,
        })
      : type(entry)
  }
}

/** the popup's status: «Planned for 10.11 · not paid yet», «Paid 03.11 · the plan was for 05.11», «Expense · 03.11» */
export function usePopupStatus() {
  const translate = useTranslations('calendar')
  const type = useEntryType()
  const words = useStatusWords()
  const short = useShortDate()

  return (entry: CalendarEntry) => {
    const status = entryStatus(entry)
    const date = short(entry.day)

    if (status === 'paid') {
      return translate('popup.paid', { date })
    }

    if (status === 'paidElsewhere') {
      return translate('popup.paidElsewhere', {
        date,
        planned: short(entry.plannedOn ?? entry.day),
      })
    }

    if (status === 'fact') {
      return translate('popup.fact', {
        type: type(entry),
        date,
      })
    }

    return translate('popup.planned', {
      date,
      status: words(entry),
    })
  }
}
