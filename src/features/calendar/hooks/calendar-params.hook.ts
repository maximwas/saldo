import { parseAsString, parseAsStringLiteral, useQueryStates } from 'nuqs'
import { useToday } from '@/contexts/clock.context'
import { CALENDAR_VIEWS, validDay } from '../utils/calendar.utils'
import { filterParsers, toFilter } from '../utils/calendar-filters.utils'

const calendarParsers = {
  view: parseAsStringLiteral(CALENDAR_VIEWS).withDefault('month'),
  /** the selected day; the view shows its month, its week or the day itself */
  date: parseAsString,
  /** the selected entry of the day panel */
  item: parseAsString,
  ...filterParsers,
}

/** ?view=&date=&item= and the filter keys: a link or a reload lands on the same period, day and filter (§18) */
export function useCalendarParams() {
  const today = useToday()
  const [url, setUrl] = useQueryStates(calendarParsers, { history: 'replace' })
  const { view, date, item, ...filterUrl } = url

  return {
    view,
    date: validDay(date) ?? today,
    today,
    item,
    filterUrl,
    filter: toFilter(filterUrl),
    setUrl,
  }
}
