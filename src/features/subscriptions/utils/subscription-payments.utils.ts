type DatedPayment = {
  dueOn: string
  state: 'plan' | 'partial' | 'unconfirmed' | 'paid'
}

const NEXT_SHOWN = 2

/** Overview's «latest and next payments»: the last paid one and the next two open ones, newest first */
export function recentPayments<TPayment extends DatedPayment>(payments: TPayment[], today: string): TPayment[] {
  const lastPaid = payments.filter((payment) => payment.state === 'paid').at(-1)
  const next = payments.filter((payment) => payment.state !== 'paid' && payment.dueOn >= today).slice(0, NEXT_SHOWN)

  return [...next.reverse(), ...(lastPaid ? [lastPaid] : [])]
}

/** History lists every payment newest first */
export const newestFirst = <TPayment extends DatedPayment>(payments: TPayment[]) =>
  [...payments].sort((left, right) => right.dueOn.localeCompare(left.dueOn))
