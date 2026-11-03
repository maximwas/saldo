import { type AvailableObligation, monthEndOf, plannedToMonthEnd } from '@/lib/finance/available-money.utils'
import { getLedgerRates } from '@/lib/finance/ledger-fx.api'
import { localDate } from '@/lib/utils/clock.utils'
import type { SaldoClient } from '@/types/supabase.types'

type PlanParams = {
  ledgerId: string
  baseCurrency: string
  now: Date
  timeZone: string
}

/** open outgoing plans to the end of today's month, past unconfirmed ones included: the summary's «with plan» line */
export async function getPlannedToMonthEnd(
  supabase: SaldoClient,
  { ledgerId, baseCurrency, now, timeZone }: PlanParams,
) {
  const [due, rates] = await Promise.all([
    supabase
      .from('obligation_states')
      .select('obligation_id, direction, due_on, remaining_minor, currency, state')
      .eq('ledger_id', ledgerId)
      .in('state', ['plan', 'partial', 'unconfirmed'])
      .lte('due_on', monthEndOf(localDate(now, timeZone))),
    getLedgerRates(supabase, ledgerId),
  ])

  if (due.error) {
    throw due.error
  }

  return plannedToMonthEnd({
    baseCurrency,
    rates,
    now,
    timeZone,
    obligations: (due.data ?? []).map((row) => ({
      id: row.obligation_id,
      direction: row.direction as AvailableObligation['direction'],
      dueOn: row.due_on,
      remainingMinor: row.remaining_minor,
      currency: row.currency,
      state: row.state as AvailableObligation['state'],
    })),
  })
}
