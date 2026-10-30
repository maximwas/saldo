import { describe, expect, it } from 'vitest'
import type { NavLink } from '@/constants/navigation.constants'
import { activeHref, isMoreActive, pageTitleKey } from './navigation.utils'

const OPERATIONS_LINKS: NavLink[] = [
  { key: 'operationsAll', href: '/operations' },
  { key: 'accounts', href: '/operations/accounts' },
]

describe('activeHref', () => {
  it('picks the longest matching href', () => {
    expect(activeHref('/operations/accounts/42', OPERATIONS_LINKS)).toBe('/operations/accounts')
    expect(activeHref('/operations', OPERATIONS_LINKS)).toBe('/operations')
  })

  it('does not match a prefix that is not a path segment', () => {
    expect(activeHref('/operationsx', OPERATIONS_LINKS)).toBeNull()
  })

  it('matches the root only exactly', () => {
    expect(activeHref('/', [{ key: 'overview', href: '/' }])).toBe('/')
    expect(activeHref('/calendar', [{ key: 'overview', href: '/' }])).toBeNull()
  })
})

describe('pageTitleKey', () => {
  it('uses the section key on its first page and the sub key deeper', () => {
    expect(pageTitleKey('/')).toBe('overview')
    expect(pageTitleKey('/auto')).toBe('auto')
    expect(pageTitleKey('/operations/accounts/42')).toBe('accounts')
    expect(pageTitleKey('/notifications')).toBe('notifications')
    expect(pageTitleKey('/unknown')).toBeNull()
  })
})

describe('isMoreActive', () => {
  it('is active on the sections the «Ще» page lists', () => {
    expect(isMoreActive('/budget/goals')).toBe(true)
    expect(isMoreActive('/more')).toBe(true)
    expect(isMoreActive('/calendar')).toBe(false)
  })
})
