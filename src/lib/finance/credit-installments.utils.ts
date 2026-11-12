/** one installment of a credit schedule: a credit is one obligation per installment, numbered from the first */
export type CreditInstallment = {
  obligationId: string
  creditId: string
  sequenceNo: number
}

/** the last installment number of each credit, «installment 5 of 10» (shortcut: a schedule shortened by an early
 * repayment counts up to its last remaining number) */
export function lastInstallments(installments: CreditInstallment[]) {
  const totals = new Map<string, number>()

  for (const { creditId, sequenceNo } of installments) {
    totals.set(creditId, Math.max(totals.get(creditId) ?? 0, sequenceNo))
  }

  return totals
}
