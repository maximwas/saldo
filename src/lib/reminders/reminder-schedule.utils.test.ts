import { describe, expect, it } from 'vitest'
import { nextReminder } from './reminder-schedule.utils'

const base = {
  atTime: '09:00',
  today: '2026-10-31',
  nowTime: '10:00',
}

describe('nextReminder', () => {
  it('takes the earliest offset of the nearest payment that is still ahead', () => {
    expect(
      nextReminder({
        ...base,
        dueDates: ['2026-11-05'],
        offsetsDays: [3, 1],
      }),
    ).toEqual({
      date: '2026-11-02',
      time: '09:00',
    })
  })

  it('skips fires that already passed today and looks at the next payment', () => {
    expect(
      nextReminder({
        ...base,
        dueDates: ['2026-10-31', '2026-11-30'],
        offsetsDays: [0],
      }),
    ).toEqual({
      date: '2026-11-30',
      time: '09:00',
    })
  })

  it('keeps today when its time has not come', () => {
    expect(
      nextReminder({
        ...base,
        nowTime: '08:00',
        dueDates: ['2026-10-31'],
        offsetsDays: [0],
      })?.date,
    ).toBe('2026-10-31')
  })

  it('is null when nothing is left', () => {
    expect(
      nextReminder({
        ...base,
        dueDates: [],
        offsetsDays: [1],
      }),
    ).toBeNull()
  })
})
