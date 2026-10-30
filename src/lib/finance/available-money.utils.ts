import { convertAt, type FxRate, type RoundingMode } from '@/lib/money/fx.utils'
import { localDate } from '@/lib/utils/clock.utils'

type AvailableAccount = {
  accountId: string
  /** account_balances.balance_minor, in the account currency */
  balanceMinor: number
  currency: string
}

type AvailableObligation = {
  id: string
  /** in = expected income: shown next to the figure, never added (§3) */
  direction: 'in' | 'out'
  /** YYYY-MM-DD */
  dueOn: string
  /** obligation_states.remaining_minor; null = the amount is unknown (§7) */
  remainingMinor: number | null
  currency: string
  state: 'plan' | 'partial' | 'unconfirmed' | 'paid' | 'cancelled' | 'replaced'
}

export type AvailableMoneyInput = {
  baseCurrency: string
  /** "available until": the next income date chosen by the user (§3); the caller never invents it */
  untilOn: string
  /** accounts with include_in_available only */
  accounts: AvailableAccount[]
  obligations: AvailableObligation[]
  rates: FxRate[]
  now: Date
  /** ledgers.time_zone: «today» and the rate date are local to the ledger */
  timeZone: string
}

/** every part in minor units of the base currency; null = cannot be known, never 0 */
export type AvailableMoney = {
  availableMinor: number | null
  balancesMinor: number | null
  /** unpaid outgoing obligations due on or before untilOn, past unconfirmed ones included */
  obligationsMinor: number | null
  expectedIncomeMinor: number | null
  /** obligations counted in obligationsMinor, by due date */
  obligationIds: string[]
  unknownAmountIds: string[]
  unknownRateCurrencies: string[]
}

// current balances are revalued on today's rate; Postgres round() rounds half away from zero the same way
const ROUNDING: RoundingMode = 'half_up'

const OPEN_STATES = new Set<AvailableObligation['state']>(['plan', 'partial', 'unconfirmed'])

type Money = {
  amountMinor: number | null
  currency: string
}

/** sum in the base currency; null when any amount or rate is unknown, and the unknown rate currencies are collected */
function sumInBase(
  items: Money[],
  input: AvailableMoneyInput,
  today: string,
  unknownRates: Set<string>,
): number | null {
  let total: number | null = 0

  for (const item of items) {
    const converted =
      item.amountMinor === null
        ? null
        : convertAt(item.amountMinor, item.currency, input.baseCurrency, input.rates, today, ROUNDING)

    if (item.amountMinor !== null && converted === null) {
      unknownRates.add(item.currency)
    }

    total = total === null || converted === null ? null : total + converted
  }

  return total
}

/** "available until a date" (§3) without reserves yet: included balances − unpaid obligations due by untilOn */
export function computeAvailableMoney(input: AvailableMoneyInput): AvailableMoney {
  const today = localDate(input.now, input.timeZone)
  const unknownRates = new Set<string>()
  const due = input.obligations
    .filter((obligation) => OPEN_STATES.has(obligation.state) && obligation.dueOn <= input.untilOn)
    .sort((first, second) => first.dueOn.localeCompare(second.dueOn))
  const outgoing = due.filter((obligation) => obligation.direction === 'out')
  const incoming = due.filter((obligation) => obligation.direction === 'in')

  const balancesMinor = sumInBase(
    input.accounts.map((account) => ({
      amountMinor: account.balanceMinor,
      currency: account.currency,
    })),
    input,
    today,
    unknownRates,
  )
  const obligationsMinor = sumInBase(
    outgoing.map((obligation) => ({
      amountMinor: obligation.remainingMinor,
      currency: obligation.currency,
    })),
    input,
    today,
    unknownRates,
  )
  const expectedIncomeMinor = sumInBase(
    incoming.map((obligation) => ({
      amountMinor: obligation.remainingMinor,
      currency: obligation.currency,
    })),
    input,
    today,
    unknownRates,
  )

  return {
    availableMinor: balancesMinor === null || obligationsMinor === null ? null : balancesMinor - obligationsMinor,
    balancesMinor,
    obligationsMinor,
    expectedIncomeMinor,
    obligationIds: outgoing.map((obligation) => obligation.id),
    unknownAmountIds: outgoing
      .filter((obligation) => obligation.remainingMinor === null)
      .map((obligation) => obligation.id),
    unknownRateCurrencies: [...unknownRates],
  }
}
