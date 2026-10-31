import { describe, expect, it } from 'vitest'
import { type CreditFormValues, creditFormSchema, toSaveCreditInput } from './credit-form.schema'
import { toReplaceCreditScheduleInput } from './early-repayment-form.schema'
import { replaceCreditScheduleInputSchema } from './replace-credit-schedule-input.schema'
import { saveCreditInputSchema } from './save-credit-input.schema'

const context = {
  id: '3c4d5e6f-7a8b-4c9d-8e0f-1a2b3c4d5e6f',
  ledgerId: '7c1d2e3f-4a5b-4c6d-8e9f-0a1b2c3d4e5f',
  version: null,
}

const base: CreditFormValues = {
  mode: 'equal',
  name: 'Ноутбук',
  lender: 'Comfy',
  currency: 'UAH',
  accountId: null,
  price: '1000',
  total: '1000',
  count: '3',
  firstOn: '2026-01-31',
  remaining: '',
  installment: '',
  paidCount: '0',
  rows: [],
}

const errorPaths = (values: CreditFormValues) =>
  creditFormSchema.safeParse(values).error?.issues.map((issue) => issue.path.join('.')) ?? []

describe('creditFormSchema', () => {
  it('checks only the fields of the chosen way', () => {
    expect(errorPaths(base)).toEqual([])
    expect(
      errorPaths({
        ...base,
        count: '0',
        total: '',
      }),
    ).toEqual(['total', 'count'])
    expect(
      errorPaths({
        ...base,
        mode: 'existing',
        paidCount: '',
      }),
    ).toEqual(['remaining', 'installment', 'paidCount'])
    expect(
      errorPaths({
        ...base,
        mode: 'schedule',
      }),
    ).toEqual(['rows'])
    expect(
      errorPaths({
        ...base,
        mode: 'edit',
        total: '',
        count: '',
      }),
    ).toEqual([])
  })

  it('takes an empty purchase price as unknown but rejects zero', () => {
    expect(
      errorPaths({
        ...base,
        price: '',
      }),
    ).toEqual([])
    expect(
      errorPaths({
        ...base,
        price: '0',
      }),
    ).toEqual(['price'])
  })
})

describe('toSaveCreditInput', () => {
  it('equal installments: the rounding remainder in the last one, an estimated schedule, no fake past', () => {
    const input = toSaveCreditInput(base, context)

    expect(saveCreditInputSchema.parse(input).installments).toEqual([
      {
        sequence_no: 1,
        due_on: '2026-01-31',
        amount_minor: 33_333,
      },
      {
        sequence_no: 2,
        due_on: '2026-02-28',
        amount_minor: 33_333,
      },
      {
        sequence_no: 3,
        due_on: '2026-03-31',
        amount_minor: 33_334,
      },
    ])
    expect(input.credit).toMatchObject({
      installments_count: 3,
      regular_installment_minor: 33_333,
      last_installment_minor: 33_334,
      total_payable_minor: 100_000,
      purchase_price_minor: 100_000,
      schedule_accuracy: 'estimated',
      paid_before_tracking_count: 0,
    })
  })

  it('an existing credit: numbers after the installments paid before tracking, the total unknown', () => {
    const input = toSaveCreditInput(
      {
        ...base,
        mode: 'existing',
        price: '',
        remaining: '250',
        installment: '100',
        paidCount: '2',
        firstOn: '2026-11-05',
      },
      context,
    )

    expect(input.installments?.map((row) => [row.sequence_no, row.amount_minor])).toEqual([
      [3, 10_000],
      [4, 10_000],
      [5, 5_000],
    ])
    expect(input.credit).toMatchObject({
      installments_count: 5,
      regular_installment_minor: 10_000,
      last_installment_minor: 5_000,
      total_payable_minor: null,
      purchase_price_minor: null,
      paid_before_tracking_count: 2,
      paid_before_tracking_minor: 20_000,
    })
  })

  it('a typed schedule is the bank one, numbered by date', () => {
    const input = toSaveCreditInput(
      {
        ...base,
        mode: 'schedule',
        rows: [
          {
            dueOn: '2026-12-05',
            amount: '120',
          },
          {
            dueOn: '2026-11-05',
            amount: '100',
          },
        ],
      },
      context,
    )

    expect(input.installments?.map((row) => [row.sequence_no, row.due_on])).toEqual([
      [1, '2026-11-05'],
      [2, '2026-12-05'],
    ])
    expect(input.credit).toMatchObject({
      schedule_accuracy: 'bank_confirmed',
      total_payable_minor: 22_000,
      last_installment_minor: 12_000,
    })
  })

  it('an edit patches the descriptive fields with its version and keeps the schedule', () => {
    const input = toSaveCreditInput(
      {
        ...base,
        mode: 'edit',
        lender: ' ',
      },
      {
        ...context,
        version: 4,
      },
    )

    expect(saveCreditInputSchema.parse(input)).toEqual({
      credit: {
        id: context.id,
        ledger_id: context.ledgerId,
        name: 'Ноутбук',
        lender: null,
        purchase_price_minor: 100_000,
        account_id: null,
        version: 4,
      },
      installments: null,
    })
  })
})

describe('toReplaceCreditScheduleInput', () => {
  it('replaces the unpaid rest with one installment of the whole rest, due on the payoff date', () => {
    const input = toReplaceCreditScheduleInput(
      { payOn: '2026-10-30' },
      {
        id: '9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d',
        creditId: context.id,
        version: 3,
        payoff: {
          amountMinor: 2_437_425,
          count: 9,
          sequenceNo: 4,
          occurrenceOn: '2026-11-05',
        },
      },
    )

    expect(replaceCreditScheduleInputSchema.parse(input).installments).toEqual([
      {
        id: '9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d',
        sequence_no: 4,
        occurrence_on: '2026-11-05',
        due_on: '2026-10-30',
        amount_minor: 2_437_425,
      },
    ])
  })
})
