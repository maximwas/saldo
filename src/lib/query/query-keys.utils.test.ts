import { describe, expect, it } from 'vitest'
import { ledgerQueryKey } from './query-keys.utils'

describe('ledgerQueryKey', () => {
  it('puts the root first and the space second', () => {
    expect(ledgerQueryKey('operations', 'l1', 'list', { month: '2026-10' })).toEqual([
      'operations',
      'l1',
      'list',
      { month: '2026-10' },
    ])
  })

  it('gives two spaces different keys', () => {
    expect(ledgerQueryKey('accounts', 'l1')).not.toEqual(ledgerQueryKey('accounts', 'l2'))
  })
})
