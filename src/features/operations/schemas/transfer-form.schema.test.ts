import { describe, expect, it } from 'vitest'
import { createTransferInputSchema } from './create-transfer-input.schema'
import { type TransferFormValues, toCreateTransferInput, transferFormSchema } from './transfer-form.schema'

const CARD = '0b6f7a52-1d2e-4c3b-9a8f-1e2d3c4b5a69'
const EURO = '1c7a8b63-2e3f-4d4c-8b9a-2f3e4d5c6b7a'
const LEDGER = '7c1d2e3f-4a5b-4c6d-8e9f-0a1b2c3d4e5f'
const TRANSFER = '3e4f5a6b-7c8d-4e9f-8a0b-1c2d3e4f5a6b'
const BANK_FEES = '4f5a6b7c-8d9e-4f0a-9b1c-2d3e4f5a6b7d'

const clock = {
  timeZone: 'Europe/Kyiv',
  now: () => new Date('2026-10-30T12:00:00Z'),
}

const exchange: TransferFormValues = {
  fromAccountId: CARD,
  toAccountId: EURO,
  fromAmount: '33 200',
  fromCurrency: 'UAH',
  toAmount: '800',
  toCurrency: 'EUR',
  fee: '',
  feeCategoryId: null,
  occurredOn: '2026-10-30',
  note: '',
}

const ids = {
  id: TRANSFER,
  ledgerId: LEDGER,
}

describe('transferFormSchema', () => {
  it('accepts a transfer between currencies with both real amounts', () => {
    expect(transferFormSchema.safeParse(exchange).success).toBe(true)
  })

  it('rejects the same account on both sides', () => {
    const result = transferFormSchema.safeParse({
      ...exchange,
      toAccountId: CARD,
    })

    expect(result.error?.issues[0]).toMatchObject({
      path: ['toAccountId'],
      message: 'sameAccount',
    })
  })

  it('requires the received amount when the currencies differ', () => {
    const result = transferFormSchema.safeParse({
      ...exchange,
      toAmount: '',
    })

    expect(result.error?.issues[0]?.path).toEqual(['toAmount'])
  })
})

describe('toCreateTransferInput', () => {
  it('keeps both real amounts and does not fit them to a rate (§5)', () => {
    const input = toCreateTransferInput(
      {
        ...exchange,
        fee: '15',
        feeCategoryId: BANK_FEES,
      },
      clock,
      ids,
    )

    expect(createTransferInputSchema.parse(input)).toMatchObject({
      id: TRANSFER,
      ledger_id: LEDGER,
      from_amount_minor: 3_320_000,
      to_amount_minor: 80_000,
      fee_minor: 1_500,
      fee_category_id: BANK_FEES,
      note: null,
    })
  })

  it('copies the amount when the currency is the same and the received field is empty', () => {
    const input = toCreateTransferInput(
      {
        ...exchange,
        toCurrency: 'UAH',
        toAmount: '',
        feeCategoryId: BANK_FEES,
      },
      clock,
      ids,
    )

    expect(input.to_amount_minor).toBe(3_320_000)
    expect(input.fee_minor).toBeNull()
    expect(input.fee_category_id).toBeNull()
  })
})
