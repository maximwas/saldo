import { describe, expect, it } from 'vitest'
import { type MembershipRow, pickMembership, toActiveLedger } from './active-ledger.utils'

const member = (ledgerId: string, role = 'editor'): MembershipRow => ({
  ledger_id: ledgerId,
  role,
  ledgers: {
    name: `Space ${ledgerId}`,
    time_zone: 'Europe/Warsaw',
    base_currency: 'PLN',
  },
})

const rows = [member('a'), member('b', 'owner'), member('c')]

describe('pickMembership', () => {
  it('takes the first preferred space the user belongs to', () => {
    expect(pickMembership(rows, [undefined, 'c', 'a'])?.ledger_id).toBe('c')
  })

  it('skips a preferred space the user is not a member of', () => {
    expect(pickMembership(rows, ['gone', null])?.ledger_id).toBe('b')
  })

  it('falls back to the first row without an own space', () => {
    expect(pickMembership([member('a'), member('c')], [])?.ledger_id).toBe('a')
  })

  it('is undefined without memberships', () => {
    expect(pickMembership([], ['a'])).toBeUndefined()
  })
})

describe('toActiveLedger', () => {
  it('maps the active space and lists all of them', () => {
    expect(toActiveLedger(rows[1], rows)).toEqual({
      ledgerId: 'b',
      role: 'owner',
      timeZone: 'Europe/Warsaw',
      baseCurrency: 'PLN',
      ledgers: [
        {
          id: 'a',
          name: 'Space a',
          role: 'editor',
        },
        {
          id: 'b',
          name: 'Space b',
          role: 'owner',
        },
        {
          id: 'c',
          name: 'Space c',
          role: 'editor',
        },
      ],
    })
  })

  it('uses Kyiv time, UAH and an empty name when the space is not readable', () => {
    const hidden: MembershipRow = {
      ledger_id: 'x',
      role: 'viewer',
      ledgers: null,
    }

    expect(toActiveLedger(hidden, [hidden])).toMatchObject({
      timeZone: 'Europe/Kyiv',
      baseCurrency: 'UAH',
      ledgers: [{ name: '' }],
    })
  })
})
