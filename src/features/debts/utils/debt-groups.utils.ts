import type { DebtRow } from '../api/debts.api'
import type { DebtDirection } from './debts.utils'

export type DebtState = 'open' | 'partial' | 'returned' | 'settled' | 'written_off'

type StateFields = Pick<DebtRow, 'status' | 'repaidMinor' | 'remainingMinor'>

/** what the row shows: an open debt paid back to 0 reads «returned» until it is closed; status wins once it is set */
export function debtState(debt: StateFields): DebtState {
  if (debt.status !== 'open') {
    return debt.status
  }

  if (debt.remainingMinor === 0) {
    return 'returned'
  }

  return debt.repaidMinor > 0 ? 'partial' : 'open'
}

/** a debt that still asks for money */
const isOwed = (debt: StateFields) => debt.status === 'open' && debt.remainingMinor > 0

export type CurrencyTotal = {
  currency: DebtRow['currency']
  minor: number
}

/** what is still owed in one direction, per currency (no rates here: a sum of different currencies means nothing) */
export function owedTotals(debts: DebtRow[], direction: DebtDirection): CurrencyTotal[] {
  const totals = new Map<DebtRow['currency'], number>()

  for (const debt of debts) {
    if (debt.direction === direction && isOwed(debt)) {
      totals.set(debt.currency, (totals.get(debt.currency) ?? 0) + debt.remainingMinor)
    }
  }

  return [...totals].map(([currency, minor]) => ({
    currency,
    minor,
  }))
}

export const openCount = (debts: DebtRow[], direction: DebtDirection) =>
  debts.filter((debt) => debt.direction === direction && isOwed(debt)).length

/** the first open debt of the direction that is partly repaid: «Oleh has already repaid 500 of 2 000» */
export const partlyRepaid = (debts: DebtRow[], direction: DebtDirection) =>
  debts.find((debt) => debt.direction === direction && debtState(debt) === 'partial') ?? null

/** the earliest due date among the open debts of the direction; null when none has one */
export function nearestDue(debts: DebtRow[], direction: DebtDirection) {
  const dates = debts
    .filter((debt) => debt.direction === direction && isOwed(debt) && debt.dueOn)
    .map((debt) => debt.dueOn)

  return dates.length > 0 ? dates.reduce((first, day) => ((day ?? '') < (first ?? '') ? day : first)) : null
}
