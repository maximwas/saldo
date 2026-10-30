import { describe, expect, it } from 'vitest'
import { isoToDate } from './overview.utils'

describe('isoToDate', () => {
  it('keeps the calendar day in UTC', () => {
    expect(isoToDate('2026-11-14').toISOString()).toBe('2026-11-14T12:00:00.000Z')
  })
})
