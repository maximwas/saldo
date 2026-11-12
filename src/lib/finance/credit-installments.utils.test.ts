import { describe, expect, it } from 'vitest'
import { lastInstallments } from './credit-installments.utils'

describe('lastInstallments', () => {
  it('takes the highest number of each credit schedule as its last installment', () => {
    const totals = lastInstallments([
      {
        obligationId: 'o1',
        creditId: 'comfy',
        sequenceNo: 3,
      },
      {
        obligationId: 'o2',
        creditId: 'comfy',
        sequenceNo: 12,
      },
      {
        obligationId: 'o3',
        creditId: 'rozetka',
        sequenceNo: 6,
      },
    ])

    expect(totals.get('comfy')).toBe(12)
    expect(totals.get('rozetka')).toBe(6)
    expect(totals.get('allo')).toBeUndefined()
  })
})
