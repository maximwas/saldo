import { describe, expect, it } from 'vitest'
import { toPgError } from './pg-error.utils'

describe('toPgError', () => {
  it('maps RLS denial to forbidden', () => {
    const error = toPgError({
      code: '42501',
      message: 'new row violates row-level security policy for table "ledger_invites"',
    })

    expect(error.kind).toBe('forbidden')
    expect(error.constraint).toBeNull()
  })

  it('maps PT409 to conflict', () => {
    expect(
      toPgError({
        code: 'PT409',
        message: 'version conflict',
      }).kind,
    ).toBe('conflict')
  })

  it('takes the constraint name of a check violation', () => {
    const error = toPgError({
      code: '23514',
      message: 'new row for relation "ledgers" violates check constraint "ledgers_base_currency_check"',
    })

    expect(error).toMatchObject({
      kind: 'invalid',
      constraint: 'ledgers_base_currency_check',
    })
  })

  it('falls back to unknown', () => {
    expect(
      toPgError({
        code: null,
        message: null,
      }),
    ).toMatchObject({
      kind: 'unknown',
      constraint: null,
    })
  })
})
