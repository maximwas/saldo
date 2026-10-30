import { scaleMinor } from '@/lib/money/fx.utils'
import { type Series, takeOccurrences } from '@/lib/recurrence/recurrence.utils'

/** credits.schedule_accuracy: a stored label, nothing is computed from it */
type ScheduleAccuracy = 'bank_confirmed' | 'estimated'

type Installment = {
  /** obligations.sequence_no, counted from the first installment of the credit */
  sequenceNo: number
  /** YYYY-MM-DD */
  dueOn: string
  amountMinor: number
}

export type CreditSchedule = {
  accuracy: ScheduleAccuracy
  installments: Installment[]
}

type Split = {
  count: number
  regularMinor: number
  lastMinor: number
}

/** monthly on the day of the first date; a missing 29–31 falls on the last day of the month */
const monthlyFrom = (firstOn: string): Series => ({
  unit: 'month',
  count: 1,
  firstOn,
  shortMonthRule: 'last_day',
})

/** dividing rounded sums never gives the bank's schedule (§9), so a generated one is always estimated */
function scheduleOf(firstOn: string, split: Split, firstSequenceNo: number): CreditSchedule {
  const lastIndex = split.count - 1
  const installments = takeOccurrences(monthlyFrom(firstOn), split.count).map((dueOn, index) => ({
    sequenceNo: firstSequenceNo + index,
    dueOn,
    amountMinor: index === lastIndex ? split.lastMinor : split.regularMinor,
  }))

  return {
    accuracy: 'estimated',
    installments,
  }
}

/** total ÷ count rounded down; the rounding remainder goes into the last installment, so the sum is the total */
function splitEqually(totalMinor: number, count: number): Split {
  const regularMinor = scaleMinor(totalMinor, 1, count, 'down')

  return {
    count,
    regularMinor,
    lastMinor: totalMinor - regularMinor * (count - 1),
  }
}

/** whole installments while the balance covers them, then whatever is left as a smaller last one */
function splitRemaining(remainingMinor: number, installmentMinor: number): Split {
  const whole = scaleMinor(remainingMinor, 1, installmentMinor, 'down')
  const restMinor = remainingMinor - whole * installmentMinor

  if (restMinor === 0) {
    return {
      count: whole,
      regularMinor: installmentMinor,
      lastMinor: installmentMinor,
    }
  }

  return {
    count: whole + 1,
    regularMinor: installmentMinor,
    lastMinor: restMinor,
  }
}

type EqualInstallmentsInput = {
  totalMinor: number
  /** installments_count, a positive integer */
  count: number
  firstOn: string
}

/** equal installments: the total split into `count` monthly installments from `firstOn` */
export function equalInstallments({ totalMinor, count, firstOn }: EqualInstallmentsInput): CreditSchedule {
  return scheduleOf(firstOn, splitEqually(totalMinor, count), 1)
}

type ExistingCreditInput = {
  /** the next unpaid due date */
  nextOn: string
  remainingMinor: number
  /** the regular installment the user knows */
  installmentMinor: number
  /** paid_before_tracking_count: installments paid before tracking, with no fake operations */
  paidCount: number
}

/** an existing credit: the rest of a running credit from its next date, remaining balance and regular installment */
export function existingCreditInstallments(input: ExistingCreditInput): CreditSchedule {
  const split = splitRemaining(input.remainingMinor, input.installmentMinor)

  return scheduleOf(input.nextOn, split, input.paidCount + 1)
}
