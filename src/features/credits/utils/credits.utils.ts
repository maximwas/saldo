import { currencySymbol, formatMinor } from '@/lib/money/money.utils'
import type { Credit, CreditInstallment } from '../api/credits.api'

/** money inside a sentence: an unknown sum reads «? ₴», never 0 */
export const moneyText = (minor: number | null, currency: string, locale: string) =>
  minor === null ? `? ${currencySymbol(currency, locale)}` : formatMinor(minor, currency, locale)

/** YYYY-MM-DD → 05.11 (or 05.11.2026); noon UTC, so no time zone moves the day */
export const dayText = (iso: string, locale: string, withYear = false) =>
  new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: '2-digit',
    ...(withYear && { year: 'numeric' }),
    timeZone: 'UTC',
  }).format(new Date(`${iso}T12:00:00Z`))

/** a segment of InstallmentSteps (Figma 2:10383): paid green, the next one blue, date passed amber, the rest grey */
export type StepState = 'paid' | 'current' | 'unconfirmed' | 'plan'

const OPEN_STATES = new Set<string>(['plan', 'partial', 'unconfirmed'])

const isOpen = (installment: CreditInstallment) => OPEN_STATES.has(installment.state)

/** the installments in force: replaced and cancelled ones are history */
export const activeInstallments = (credit: Credit) =>
  credit.installments.filter((installment) => installment.state !== 'replaced' && installment.state !== 'cancelled')

/** one unknown amount makes the sum unknown (§7: null, never 0) */
function sumKnown(amounts: readonly (number | null)[]): number | null {
  let total = 0

  for (const amount of amounts) {
    if (amount === null) {
      return null
    }

    total += amount
  }

  return total
}

function stepOf(installment: CreditInstallment, next: CreditInstallment | null): StepState {
  if (installment.state === 'paid') {
    return 'paid'
  }

  if (installment.state === 'unconfirmed') {
    return 'unconfirmed'
  }

  return installment === next ? 'current' : 'plan'
}

export type CreditProgress = {
  /** installments paid before tracking first, then the schedule in force */
  steps: StepState[]
  paidCount: number
  /** null when the sum paid before tracking is unknown */
  paidMinor: number | null
  openCount: number
  /** what is left by the schedule; null when an open installment has an unknown amount */
  remainingMinor: number | null
  next: CreditInstallment | null
  /** due date of the last installment in force */
  endOn: string | null
}

export function creditProgress(credit: Credit): CreditProgress {
  const active = activeInstallments(credit)
  const open = active.filter(isOpen)
  const next = open[0] ?? null
  const before: StepState[] = Array.from({ length: credit.paidBeforeTrackingCount }, () => 'paid')
  const steps = [...before, ...active.map((installment) => stepOf(installment, next))]
  const paidBefore = credit.paidBeforeTrackingCount === 0 ? 0 : credit.paidBeforeTrackingMinor

  return {
    steps,
    paidCount: steps.filter((step) => step === 'paid').length,
    paidMinor: sumKnown([paidBefore, ...active.map((installment) => installment.paidMinor)]),
    openCount: open.length,
    remainingMinor: sumKnown(open.map((installment) => installment.remainingMinor)),
    next,
    endOn: active.at(-1)?.dueOn ?? null,
  }
}

type CurrencyTotal = {
  currency: string
  /** planned installments due this month, paid or not */
  monthMinor: number | null
  /** planned installments due next month */
  nextMonthMinor: number | null
  remainingMinor: number | null
}

export type CreditTotals = {
  activeCount: number
  openCount: number
  endOn: string | null
  /** amounts never mix currencies: one line per currency */
  byCurrency: CurrencyTotal[]
}

function monthMinorOf(credit: Credit, month: string) {
  return sumKnown(
    activeInstallments(credit)
      .filter((installment) => installment.dueOn.startsWith(month))
      .map((installment) => installment.plannedMinor),
  )
}

/** YYYY-MM of the month after the given one */
export function nextMonthOf(month: string) {
  const [year, number] = month.split('-').map(Number)

  return number === 12 ? `${year + 1}-01` : `${year}-${String(number + 1).padStart(2, '0')}`
}

function addTotal(totals: Map<string, CurrencyTotal>, credit: Credit, month: string, remainingMinor: number | null) {
  const current = totals.get(credit.currency) ?? {
    currency: credit.currency,
    monthMinor: 0,
    nextMonthMinor: 0,
    remainingMinor: 0,
  }

  totals.set(credit.currency, {
    currency: credit.currency,
    monthMinor: sumKnown([current.monthMinor, monthMinorOf(credit, month)]),
    nextMonthMinor: sumKnown([current.nextMonthMinor, monthMinorOf(credit, nextMonthOf(month))]),
    remainingMinor: sumKnown([current.remainingMinor, remainingMinor]),
  })
}

/** YYYY-MM-DD compares as text; null = no date */
const laterOf = (current: string | null, candidate: string | null) =>
  current === null || (candidate !== null && candidate > current) ? candidate : current

/** the SummaryStrip of the list: this month's installments and what is left, over active credits */
export function creditTotals(credits: readonly Credit[], today: string): CreditTotals {
  const month = today.slice(0, 7)
  const totals = new Map<string, CurrencyTotal>()
  const active = credits.filter((credit) => credit.status === 'active')
  let openCount = 0
  let endOn: string | null = null

  for (const credit of active) {
    const progress = creditProgress(credit)

    addTotal(totals, credit, month, progress.remainingMinor)
    openCount += progress.openCount
    endOn = laterOf(endOn, progress.endOn)
  }

  return {
    activeCount: active.length,
    openCount,
    endOn,
    byCurrency: [...totals.values()],
  }
}

export type MonthNotes = {
  /** credits whose next installment falls due today */
  dueToday: string[]
  /** credits with an installment whose date passed unconfirmed */
  unconfirmed: {
    name: string
    dueOn: string
  }[]
}

/** the caption under «Installments in October»: who is due today and whose date passed */
export function monthNotes(credits: readonly Credit[], today: string): MonthNotes {
  const notes: MonthNotes = {
    dueToday: [],
    unconfirmed: [],
  }

  for (const credit of credits.filter((candidate) => candidate.status === 'active')) {
    const name = credit.lender ?? credit.name
    const open = activeInstallments(credit).filter(isOpen)
    const late = open.find((installment) => installment.state === 'unconfirmed')

    if (open.some((installment) => installment.dueOn === today)) {
      notes.dueToday.push(name)
    }

    if (late) {
      notes.unconfirmed.push({
        name,
        dueOn: late.dueOn,
      })
    }
  }

  return notes
}

export type Payoff = {
  amountMinor: number
  /** the unpaid installments the payoff replaces */
  count: number
  /** the payoff takes the number and the series date of the first of them: a paid installment may hold the payoff
   * date as its own series date, and a series date has one active installment */
  sequenceNo: number
  occurrenceOn: string
}

/** an early payoff covers the installments with no payment yet; partly paid ones stay (replace_credit_schedule) */
export function payoffOf(credit: Credit): Payoff | null {
  const unpaid = activeInstallments(credit).filter((installment) => isOpen(installment) && installment.paidMinor === 0)
  const amountMinor = sumKnown(unpaid.map((installment) => installment.plannedMinor))

  if (credit.status !== 'active' || unpaid.length === 0 || amountMinor === null) {
    return null
  }

  return {
    amountMinor,
    count: unpaid.length,
    sequenceNo: unpaid[0].sequenceNo,
    occurrenceOn: unpaid[0].occurrenceOn,
  }
}
