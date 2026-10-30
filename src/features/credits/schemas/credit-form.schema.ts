import { z } from 'zod'
import { CURRENCIES } from '@/constants/currencies.constants'
import { toMinor } from '@/lib/money/money.utils'
import { type CreditSchedule, equalInstallments, existingCreditInstallments } from '../utils/installments.utils'
import type { SaveCreditInput } from './save-credit-input.schema'

/** the three ways to enter a credit (§9); `edit` changes only the descriptive fields */
export const CREDIT_MODES = ['equal', 'existing', 'schedule'] as const

const MAX_INSTALLMENTS = 360

const scheduleRowSchema = z.object({
  dueOn: z.iso.date('dateInvalid'),
  amount: z.string(),
})

const creditFieldsSchema = z.object({
  mode: z.enum([...CREDIT_MODES, 'edit']),
  name: z.string().trim().min(1, 'nameRequired').max(200),
  lender: z.string().trim().max(200),
  currency: z.enum(CURRENCIES),
  accountId: z.uuid().nullable(),
  /** purchase price, optional: it is never an expense (§9) */
  price: z.string(),
  /** equal: the total payable */
  total: z.string(),
  /** equal: the number of installments */
  count: z.string(),
  /** equal: the first due date; existing: the next one */
  firstOn: z.string(),
  /** existing: the remaining balance */
  remaining: z.string(),
  /** existing: the regular installment */
  installment: z.string(),
  /** existing: installments paid before tracking, no fake operations (§25) */
  paidCount: z.string(),
  /** schedule: the bank's installments as typed in */
  rows: z.array(scheduleRowSchema),
})

type Fields = z.infer<typeof creditFieldsSchema>

type Issue = {
  path: (string | number)[]
  message: string
}

const issueIf = (failed: boolean, path: Issue['path'], message: string): Issue[] =>
  failed
    ? [
        {
          path,
          message,
        },
      ]
    : []

const positiveMinor = (text: string, currency: string) => (toMinor(text, currency) ?? 0) > 0

const isDate = (text: string) => z.iso.date().safeParse(text).success

function intBetween(text: string, min: number, max: number) {
  const value = Number(text)

  return text.trim() !== '' && Number.isInteger(value) && value >= min && value <= max
}

function equalIssues(values: Fields): Issue[] {
  return [
    ...issueIf(!positiveMinor(values.total, values.currency), ['total'], 'amountInvalid'),
    ...issueIf(!intBetween(values.count, 1, MAX_INSTALLMENTS), ['count'], 'installmentsCountInvalid'),
    ...issueIf(!isDate(values.firstOn), ['firstOn'], 'dateInvalid'),
  ]
}

/** whole installments plus a smaller last one, after the ones paid before tracking */
function existingCount(values: Fields) {
  const remaining = toMinor(values.remaining, values.currency) ?? 0
  const installment = toMinor(values.installment, values.currency) ?? 1

  return Number(values.paidCount) + Math.ceil(remaining / installment)
}

function existingIssues(values: Fields): Issue[] {
  const amountsValid =
    positiveMinor(values.remaining, values.currency) && positiveMinor(values.installment, values.currency)

  return [
    ...issueIf(!positiveMinor(values.remaining, values.currency), ['remaining'], 'amountInvalid'),
    ...issueIf(!positiveMinor(values.installment, values.currency), ['installment'], 'amountInvalid'),
    ...issueIf(!isDate(values.firstOn), ['firstOn'], 'dateInvalid'),
    ...issueIf(!intBetween(values.paidCount, 0, MAX_INSTALLMENTS), ['paidCount'], 'installmentsCountInvalid'),
    ...issueIf(amountsValid && existingCount(values) > MAX_INSTALLMENTS, ['installment'], 'installmentsCountInvalid'),
  ]
}

function scheduleIssues(values: Fields): Issue[] {
  return [
    ...issueIf(values.rows.length === 0 || values.rows.length > MAX_INSTALLMENTS, ['rows'], 'scheduleRequired'),
    ...values.rows.flatMap((row, index) =>
      issueIf(!positiveMinor(row.amount, values.currency), ['rows', index, 'amount'], 'amountInvalid'),
    ),
  ]
}

const MODE_ISSUES: Record<Fields['mode'], (values: Fields) => Issue[]> = {
  equal: equalIssues,
  existing: existingIssues,
  schedule: scheduleIssues,
  edit: () => [],
}

/** create a credit in one of three ways, or edit its descriptive fields: only the chosen way's fields are checked */
export const creditFormSchema = creditFieldsSchema.superRefine((values, context) => {
  const issues = [
    ...MODE_ISSUES[values.mode](values),
    ...issueIf(
      values.price.trim() !== '' && !positiveMinor(values.price, values.currency),
      ['price'],
      'amountOptionalInvalid',
    ),
  ]

  for (const issue of issues) {
    context.addIssue({
      code: 'custom',
      ...issue,
    })
  }
})

export type CreditFormValues = z.infer<typeof creditFormSchema>

type Terms = {
  schedule: CreditSchedule
  installments_count: number
  regular_installment_minor: number
  total_payable_minor: number | null
  paid_before_tracking_count: number
  paid_before_tracking_minor: number | null
}

// the values passed the schema: a NaN here would fail the input schema instead of saving a guess
const minorOf = (text: string, currency: string) => toMinor(text, currency) ?? Number.NaN

const optionalMinor = (text: string, currency: string) => (text.trim() === '' ? null : minorOf(text, currency))

function equalTerms(values: CreditFormValues): Terms {
  const totalMinor = minorOf(values.total, values.currency)
  const count = Number(values.count)
  const schedule = equalInstallments({
    totalMinor,
    count,
    firstOn: values.firstOn,
  })

  return {
    schedule,
    installments_count: count,
    regular_installment_minor: schedule.installments[0].amountMinor,
    total_payable_minor: totalMinor,
    paid_before_tracking_count: 0,
    paid_before_tracking_minor: null,
  }
}

function existingTerms(values: CreditFormValues): Terms {
  const installmentMinor = minorOf(values.installment, values.currency)
  const paidCount = Number(values.paidCount)
  const schedule = existingCreditInstallments({
    nextOn: values.firstOn,
    remainingMinor: minorOf(values.remaining, values.currency),
    installmentMinor,
    paidCount,
  })

  return {
    schedule,
    installments_count: paidCount + schedule.installments.length,
    regular_installment_minor: installmentMinor,
    // the total of the whole credit is not known from its rest
    total_payable_minor: null,
    paid_before_tracking_count: paidCount,
    paid_before_tracking_minor: paidCount * installmentMinor,
  }
}

/** a schedule typed in from the bank is confirmed: numbered by date */
function scheduleTerms(values: CreditFormValues): Terms {
  const installments = values.rows
    .toSorted((left, right) => left.dueOn.localeCompare(right.dueOn))
    .map((row, index) => ({
      sequenceNo: index + 1,
      dueOn: row.dueOn,
      amountMinor: minorOf(row.amount, values.currency),
    }))

  return {
    schedule: {
      accuracy: 'bank_confirmed',
      installments,
    },
    installments_count: installments.length,
    regular_installment_minor: installments[0].amountMinor,
    total_payable_minor: installments.reduce((sum, installment) => sum + installment.amountMinor, 0),
    paid_before_tracking_count: 0,
    paid_before_tracking_minor: null,
  }
}

const TERMS = {
  equal: equalTerms,
  existing: existingTerms,
  schedule: scheduleTerms,
} as const

type SaveContext = {
  id: string
  ledgerId: string
  /** null = create; an edit carries the version it was made from */
  version: number | null
}

function commonFields(values: CreditFormValues, context: SaveContext) {
  return {
    id: context.id,
    ledger_id: context.ledgerId,
    name: values.name.trim(),
    lender: values.lender.trim() || null,
    purchase_price_minor: optionalMinor(values.price, values.currency),
    account_id: values.accountId,
  }
}

function createInput(values: CreditFormValues, context: SaveContext, mode: (typeof CREDIT_MODES)[number]) {
  const { schedule, ...terms } = TERMS[mode](values)
  const last = schedule.installments.at(-1)?.amountMinor ?? null

  return {
    credit: {
      ...commonFields(values, context),
      ...terms,
      currency: values.currency,
      last_installment_minor: last === terms.regular_installment_minor ? null : last,
      schedule_accuracy: schedule.accuracy,
    },
    installments: schedule.installments.map((installment) => ({
      sequence_no: installment.sequenceNo,
      due_on: installment.dueOn,
      amount_minor: installment.amountMinor,
    })),
  }
}

/** form → save_credit: a create sends the generated or typed schedule; an edit patches the descriptive fields only */
export function toSaveCreditInput(values: CreditFormValues, context: SaveContext): SaveCreditInput {
  if (context.version !== null) {
    return {
      credit: {
        ...commonFields(values, context),
        version: context.version,
      },
      installments: null,
    }
  }

  if (values.mode === 'edit') {
    throw new Error('an edit carries the version it was made from')
  }

  return createInput(values, context, values.mode)
}
