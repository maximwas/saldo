import { describe, expect, it } from 'vitest'
import type { SubscriptionView } from '../api/subscriptions.api'
import {
  type SubscriptionFormValues,
  subscriptionFormSchema,
  toCancelInput,
  toCreateSubscriptionInput,
  toSetPriceInput,
  toStatusChangeInput,
  toUpdateSubscriptionInput,
} from './subscription-form.schema'
import {
  createSubscriptionInputSchema,
  setSubscriptionPriceInputSchema,
  updateSubscriptionInputSchema,
} from './subscription-input.schema'

const SUBSCRIPTION_ID = '0f0a6d1e-6a3b-4c1d-9f4e-0a1b2c3d4e5f'
const PRICE_ID = '1f0a6d1e-6a3b-4c1d-9f4e-0a1b2c3d4e5f'
const LEDGER_ID = '2f0a6d1e-6a3b-4c1d-9f4e-0a1b2c3d4e5f'
const ACCOUNT_ID = '3f0a6d1e-6a3b-4c1d-9f4e-0a1b2c3d4e5f'
const TODAY = '2026-10-30'

const values: SubscriptionFormValues = {
  name: ' Netflix ',
  amountMinor: 34_900,
  currency: 'UAH',
  accountId: ACCOUNT_ID,
  categoryId: null,
  unit: 'month',
  count: '1',
  firstOn: '2026-01-05',
  shortMonthRule: 'last_day',
  status: 'active',
  trialEndsOn: '2026-11-01',
  serviceUrl: '',
  note: '',
}

const subscription: SubscriptionView = {
  id: SUBSCRIPTION_ID,
  name: 'Netflix',
  categoryId: null,
  accountId: ACCOUNT_ID,
  currency: 'UAH',
  unit: 'month',
  count: 1,
  firstOn: '2026-01-05',
  shortMonthRule: 'last_day',
  status: 'active',
  trialEndsOn: null,
  accessEndsOn: null,
  cancelledOn: null,
  serviceUrl: null,
  note: null,
  verdict: null,
  archivedAt: null,
  version: 3,
  prices: [
    {
      effectiveOn: '2026-01-05',
      amountMinor: 34_900,
      currency: 'UAH',
    },
  ],
}

describe('subscriptionFormSchema', () => {
  it('needs an account and a whole «every N»', () => {
    const result = subscriptionFormSchema.safeParse({
      ...values,
      accountId: null,
      count: '0',
    })

    expect(result.success).toBe(false)
    expect(result.error?.issues.map((issue) => issue.message).sort()).toEqual(['accountRequired', 'countInvalid'])
  })

  it('accepts an empty amount as unknown', () => {
    expect(
      subscriptionFormSchema.safeParse({
        ...values,
        amountMinor: null,
      }).success,
    ).toBe(true)
  })
})

describe('toCreateSubscriptionInput', () => {
  const input = toCreateSubscriptionInput(values, {
    id: SUBSCRIPTION_ID,
    priceId: PRICE_ID,
    ledgerId: LEDGER_ID,
    today: TODAY,
  })

  it('passes the input schema', () => {
    expect(createSubscriptionInputSchema.safeParse(input).success).toBe(true)
  })

  it('prices from the first date and plans from today, not from the past first date', () => {
    expect(input.price.effective_on).toBe('2026-01-05')
    expect(input.series.rows[0].occurrence_on).toBe('2026-11-05')
    expect(input.series.from).toBeNull()
    expect(input.subscription.name).toBe('Netflix')
    expect(input.subscription.trial_ends_on).toBeNull()
  })
})

describe('updates', () => {
  it('a settings edit replaces the series from today', () => {
    const input = toUpdateSubscriptionInput(
      {
        ...values,
        firstOn: '2026-01-12',
      },
      subscription,
      TODAY,
    )

    expect(updateSubscriptionInputSchema.safeParse(input).success).toBe(true)
    expect(input.expectedVersion).toBe(3)
    expect(input.series?.from).toBe(TODAY)
    expect(input.series?.rows[0].occurrence_on).toBe('2026-11-12')
  })

  it('a pause or an archive leaves no planned dates from today', () => {
    expect(toStatusChangeInput(subscription, { status: 'paused' }, TODAY).series?.rows).toEqual([])
    expect(toStatusChangeInput(subscription, { archivedAt: '2026-10-30T10:00:00.000Z' }, TODAY).series?.rows).toEqual(
      [],
    )
  })

  it('a confirmed cancel stops the plan, an intent keeps it', () => {
    const confirmed = toCancelInput(
      {
        outcome: 'cancelled',
        accessEndsOn: '2026-11-05',
      },
      subscription,
      TODAY,
    )
    const intended = toCancelInput(
      {
        outcome: 'cancel_intended',
        accessEndsOn: null,
      },
      subscription,
      TODAY,
    )

    expect(confirmed.patch.cancelled_on).toBe(TODAY)
    expect(confirmed.series?.rows).toEqual([])
    expect(intended.patch.cancelled_on).toBeNull()
    expect(intended.series?.rows.length).toBeGreaterThan(0)
  })
})

describe('toSetPriceInput', () => {
  it('keeps the currency in force on the date', () => {
    const input = toSetPriceInput(
      {
        amountMinor: 39_900,
        effectiveOn: '2026-12-05',
      },
      {
        ...subscription,
        currency: 'USD',
      },
      PRICE_ID,
    )

    expect(setSubscriptionPriceInputSchema.safeParse(input).success).toBe(true)
    expect(input.currency).toBe('UAH')
  })
})
