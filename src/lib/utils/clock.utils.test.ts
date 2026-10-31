import { describe, expect, it } from 'vitest'
import { localTime, toOccurredAt } from './clock.utils'

const clock = {
  timeZone: 'Europe/Kyiv',
  now: () => new Date('2026-10-30T15:20:00Z'),
}

describe('toOccurredAt', () => {
  it('takes the local time when one is given', () => {
    // 26.10 is past the switch to winter time: UTC+2
    expect(toOccurredAt('2026-10-26', clock, '18:40')).toBe('2026-10-26T16:40:00.000Z')
  })

  it('takes now for today and local noon for another day without a time', () => {
    expect(toOccurredAt('2026-10-30', clock)).toBe('2026-10-30T15:20:00.000Z')
    expect(toOccurredAt('2026-10-20', clock)).toBe('2026-10-20T09:00:00.000Z')
  })
})

describe('localTime', () => {
  it('reads HH:mm in the time zone', () => {
    expect(localTime(new Date('2026-10-26T16:40:00Z'), 'Europe/Kyiv')).toBe('18:40')
  })
})
