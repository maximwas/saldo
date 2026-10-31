import { describe, expect, it } from 'vitest'
import { translateErrors } from './translate-errors.utils'

const translate = (key: string) => `t:${key}`

describe('translateErrors', () => {
  it('translates messages of fields and keeps the ref untouched', () => {
    const ref = { name: 'amount' }
    const result = translateErrors(
      {
        amount: {
          type: 'custom',
          message: 'amountInvalid',
          ref,
        },
        note: {
          type: 'custom',
          message: 'adjustmentNote',
        },
      } as never,
      translate,
    ) as Record<
      string,
      {
        message: string
        ref?: unknown
      }
    >

    expect(result.amount.message).toBe('t:amountInvalid')
    expect(result.amount.ref).toBe(ref)
    expect(result.note.message).toBe('t:adjustmentNote')
  })

  it('leaves an empty error set empty', () => {
    expect(translateErrors({}, translate)).toEqual({})
  })
})
