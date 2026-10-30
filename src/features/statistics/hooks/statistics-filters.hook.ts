import { parseAsString, parseAsStringLiteral, useQueryStates } from 'nuqs'
import { useToday } from '@/contexts/clock.context'
import { useLedgerStore } from '@/contexts/ledger.context'
import type { StatsParams } from '../api/statistics.api'
import { BUCKETS, periodValue, resolvePeriod, VIEWS } from '../utils/statistics-period.utils'

const parsers = {
  period: parseAsString,
  bucket: parseAsStringLiteral(BUCKETS),
  who: parseAsString,
  view: parseAsStringLiteral(VIEWS).withDefault('chart'),
}

/** ?period=2026-10|3m|6m|12m|2026&bucket=week&who=<user id>&view=table: a link or a reload keeps the screen */
export function useStatisticsFilters() {
  const today = useToday()
  const ledgerId = useLedgerStore((ledger) => ledger.ledgerId)
  const [url, setUrl] = useQueryStates(parsers, { history: 'replace' })
  const period = periodValue(url.period, today)
  const range = resolvePeriod(period, today)
  const params: StatsParams = {
    ledgerId,
    from: range.from,
    to: range.to,
    bucket: url.bucket ?? range.bucket,
    createdBy: url.who,
  }

  return {
    today,
    period,
    params,
    who: url.who,
    view: url.view,
    setUrl,
  }
}
