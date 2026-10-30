import { describe, expect, it } from 'vitest'
import type { FxRate } from '@/lib/money/fx.utils'
import {
  monthlyCost,
  plannedOccurrences,
  priceOn,
  type Subscription,
  type SubscriptionPrice,
  subscriptionTotals,
  takesNewPrice,
} from './subscriptions.utils'

const oldPrice: SubscriptionPrice = {
  effectiveOn: '2026-01-01',
  amountMinor: 19_900,
  currency: 'UAH',
}
const newPrice: SubscriptionPrice = {
  effectiveOn: '2026-12-05',
  amountMinor: 24_900,
  currency: 'UAH',
}

const music: Subscription = {
  unit: 'month',
  count: 1,
  firstOn: '2026-10-05',
  currency: 'UAH',
  prices: [newPrice, oldPrice],
}

const priced = (unit: Subscription['unit'], count: number, amountMinor: number | null): Subscription => ({
  unit,
  count,
  firstOn: '2026-01-10',
  currency: 'UAH',
  prices: [
    {
      effectiveOn: '2026-01-01',
      amountMinor,
      currency: 'UAH',
    },
  ],
})

describe('priceOn', () => {
  it('takes the latest price on or before the date, whatever the order of rows', () => {
    expect(priceOn(music.prices, '2026-12-04')).toBe(oldPrice)
    expect(priceOn(music.prices, '2026-12-05')).toBe(newPrice)
  })

  it('returns null before the first price', () => {
    expect(priceOn(music.prices, '2025-12-31')).toBeNull()
  })
})

describe('plannedOccurrences', () => {
  it('prices each occurrence by its own date: the new price starts on its effective date', () => {
    expect(plannedOccurrences(music, '2026-10-01', '2027-01-31')).toEqual([
      {
        occurrenceOn: '2026-10-05',
        amountMinor: 19_900,
        currency: 'UAH',
      },
      {
        occurrenceOn: '2026-11-05',
        amountMinor: 19_900,
        currency: 'UAH',
      },
      {
        occurrenceOn: '2026-12-05',
        amountMinor: 24_900,
        currency: 'UAH',
      },
      {
        occurrenceOn: '2027-01-05',
        amountMinor: 24_900,
        currency: 'UAH',
      },
    ])
  })

  it('keeps the amount unknown before any price, never 0', () => {
    const early = {
      ...music,
      firstOn: '2025-12-05',
    }

    expect(plannedOccurrences(early, '2025-12-01', '2025-12-31')).toEqual([
      {
        occurrenceOn: '2025-12-05',
        amountMinor: null,
        currency: 'UAH',
      },
    ])
  })
})

describe('takesNewPrice', () => {
  it('changes only unpaid obligations on or after the effective date', () => {
    expect(
      takesNewPrice(
        {
          occurrenceOn: '2026-11-05',
          paidMinor: 0,
        },
        '2026-12-05',
      ),
    ).toBe(false)
    expect(
      takesNewPrice(
        {
          occurrenceOn: '2026-12-05',
          paidMinor: 0,
        },
        '2026-12-05',
      ),
    ).toBe(true)
    expect(
      takesNewPrice(
        {
          occurrenceOn: '2027-01-05',
          paidMinor: 5_000,
        },
        '2026-12-05',
      ),
    ).toBe(false)
  })
})

describe('monthlyCost', () => {
  it.each<[string, Subscription, number]>([
    ['monthly', priced('month', 1, 19_900), 19_900],
    ['every 3 months', priced('month', 3, 30_000), 10_000],
    ['yearly', priced('year', 1, 100_000), 8_333],
    ['weekly', priced('day', 7, 10_000), 43_481],
    ['every 30 days', priced('day', 30, 15_000), 15_218],
  ])('normalizes a %s price to a month with half_up', (_label, subscription, expected) => {
    expect(monthlyCost(subscription, '2026-10-30')).toEqual({
      amountMinor: expected,
      currency: 'UAH',
    })
  })

  it('keeps an unknown price unknown', () => {
    expect(monthlyCost(priced('year', 1, null), '2026-10-30').amountMinor).toBeNull()
  })
})

describe('subscriptionTotals', () => {
  const rates: FxRate[] = [
    {
      baseCurrency: 'USD',
      quoteCurrency: 'UAH',
      rate: '40',
      rateOn: '2026-01-01',
      source: 'reference',
    },
  ]
  const yearly: Subscription = {
    ...priced('year', 1, 120_000),
    firstOn: '2026-03-10',
  }
  const dollars: Subscription = {
    unit: 'month',
    count: 1,
    firstOn: '2026-01-15',
    currency: 'USD',
    prices: [
      {
        effectiveOn: '2026-01-01',
        amountMinor: 1_000,
        currency: 'USD',
      },
    ],
  }
  const totals = (month: string, subscriptions: Subscription[]) =>
    subscriptionTotals({
      subscriptions,
      month,
      date: '2026-03-01',
      baseCurrency: 'UAH',
      rates,
    })

  it('puts a yearly price whole into its month plan but only a twelfth into the normalized average', () => {
    expect(totals('2026-03', [yearly, dollars])).toEqual({
      planned: {
        totalMinor: 160_000,
        unknownCount: 0,
      },
      normalized: {
        totalMinor: 50_000,
        unknownCount: 0,
      },
    })
    expect(totals('2026-04', [yearly, dollars])).toEqual({
      planned: {
        totalMinor: 40_000,
        unknownCount: 0,
      },
      normalized: {
        totalMinor: 50_000,
        unknownCount: 0,
      },
    })
  })

  it('counts an unknown price or a missing rate apart instead of adding 0', () => {
    const unknown = priced('month', 1, null)
    const euros: Subscription = {
      ...dollars,
      currency: 'EUR',
      prices: [
        {
          ...dollars.prices[0],
          currency: 'EUR',
        },
      ],
    }

    expect(totals('2026-03', [unknown, euros])).toEqual({
      planned: {
        totalMinor: 0,
        unknownCount: 2,
      },
      normalized: {
        totalMinor: 0,
        unknownCount: 2,
      },
    })
  })
})
