import { useQueryStates } from 'nuqs'
import { useClock } from '@/contexts/clock.context'
import { localDate } from '@/lib/utils/clock.utils'
import { hasActiveFilters, operationFilterParsers, periodValue, resolveFilters } from '../utils/operation-filters.utils'

/** the list filters live in the URL (?period=&account=&category=&type=), so a link or a reload keeps them */
export function useOperationFilters() {
  const clock = useClock()
  const [url, setUrl] = useQueryStates(operationFilterParsers, { history: 'replace' })
  const today = localDate(clock.now(), clock.timeZone)

  return {
    today,
    url,
    filters: resolveFilters(url, today),
    /** the value the period select shows: a month or «all» */
    period: periodValue(url.period, today),
    active: hasActiveFilters(url),
    setUrl,
    reset: () =>
      setUrl({
        period: null,
        account: null,
        category: null,
        who: null,
        type: null,
      }),
  }
}
