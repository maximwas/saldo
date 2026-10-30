import { describe, expect, it } from 'vitest'
import type { NavLink } from '@/constants/navigation.constants'
import { activeHref, isMoreActive, pageTitle } from './navigation.utils'

const OPERATIONS_LINKS: NavLink[] = [
  { label: 'Усі операції', href: '/operations' },
  { label: 'Рахунки', href: '/operations/accounts' },
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
    expect(activeHref('/', [{ label: 'Огляд', href: '/' }])).toBe('/')
    expect(activeHref('/calendar', [{ label: 'Огляд', href: '/' }])).toBeNull()
  })
})

describe('pageTitle', () => {
  it('uses the section label on its first page and the sub label deeper', () => {
    expect(pageTitle('/')).toBe('Огляд')
    expect(pageTitle('/auto')).toBe('Авто')
    expect(pageTitle('/operations/accounts/42')).toBe('Рахунки')
    expect(pageTitle('/notifications')).toBe('Сповіщення')
  })
})

describe('isMoreActive', () => {
  it('is active on the sections the «Ще» page lists', () => {
    expect(isMoreActive('/budget/goals')).toBe(true)
    expect(isMoreActive('/more')).toBe(true)
    expect(isMoreActive('/calendar')).toBe(false)
  })
})
