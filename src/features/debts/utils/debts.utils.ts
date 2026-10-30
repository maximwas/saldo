export type DebtDirection = 'owed_to_me' | 'i_owe'

export type DebtMovementKind = 'principal' | 'repayment'

/** a row of debt_movements */
export type DebtMovement = {
  kind: DebtMovementKind
  amountMinor: number
}

export type DebtBalance = {
  repaidMinor: number
  remainingMinor: number
  /** paid back beyond the principal, kept apart from the balance (§26) */
  overpaidMinor: number
}

/** partial repayments lower the debt down to 0; anything beyond is an overpayment, never a negative balance */
export function debtBalance(principalMinor: number, movements: DebtMovement[]): DebtBalance {
  const repaidMinor = movements
    .filter((movement) => movement.kind === 'repayment')
    .reduce((total, movement) => total + movement.amountMinor, 0)

  return {
    repaidMinor,
    remainingMinor: Math.max(principalMinor - repaidMinor, 0),
    overpaidMinor: Math.max(repaidMinor - principalMinor, 0),
  }
}

const OPERATION_KIND: Record<DebtDirection, Record<DebtMovementKind, 'debt_in' | 'debt_out'>> = {
  owed_to_me: {
    principal: 'debt_out',
    repayment: 'debt_in',
  },
  i_owe: {
    principal: 'debt_in',
    repayment: 'debt_out',
  },
}

/** the operation kind of a debt movement: money moves, but a loan or its repayment is never income or expense (§10) */
export const movementOperationKind = (direction: DebtDirection, kind: DebtMovementKind) =>
  OPERATION_KIND[direction][kind]

/** the columns of debts the own-share rule reads */
export type ShareDebt = {
  direction: DebtDirection
  principalMinor: number
  shareOfOperationId: string | null
}

/** the expense operation a share debt points to */
export type Purchase = {
  id: string
  amountMinor: number
}

/** own spending on a purchase: the expense stays whole in the ledger, the shares others owe for it come off only here (§10) */
export function ownShareMinor(purchase: Purchase, debts: ShareDebt[]): number {
  const othersMinor = debts
    .filter((debt) => debt.direction === 'owed_to_me' && debt.shareOfOperationId === purchase.id)
    .reduce((total, debt) => total + debt.principalMinor, 0)

  return purchase.amountMinor - othersMinor
}
