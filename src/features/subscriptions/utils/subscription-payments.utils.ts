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

/** History: what is paid or already due, newest first, apart from the open payments ahead, soonest first */
export function historyPayments<TPayment extends DatedPayment>(payments: TPayment[], today: string) {
  const isPast = (payment: TPayment) => payment.state === 'paid' || payment.dueOn < today
  const byDate = [...payments].sort((left, right) => left.dueOn.localeCompare(right.dueOn))

  return {
    past: byDate.filter(isPast).reverse(),
    upcoming: byDate.filter((payment) => !isPast(payment)),
  }
}
