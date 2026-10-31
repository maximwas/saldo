import { describe, expect, it } from 'vitest'
import { mergeQueued, recordState, summarizeQueue } from './sync-queue.utils'

describe('recordState', () => {
  it('a paused or running write is pending, a done one synced', () => {
    expect(
      recordState({
        status: 'pending',
        error: null,
      }),
    ).toBe('pending')
    expect(
      recordState({
        status: 'success',
        error: null,
      }),
    ).toBe('synced')
  })

  it('PT409 is a conflict to decide, any other answer an error', () => {
    expect(
      recordState({
        status: 'error',
        error: {
          code: 'PT409',
        },
      }),
    ).toBe('conflict')
    expect(
      recordState({
        status: 'error',
        error: {
          code: '42501',
        },
      }),
    ).toBe('error')
  })
})

describe('mergeQueued', () => {
  const server = [
    {
      id: 'a',
      amount: 100,
    },
  ]

  it('adds a queued row the server does not have yet, first', () => {
    const queued = [
      {
        id: 'b',
        amount: 200,
      },
    ]

    expect(mergeQueued(server, queued).map((row) => row.id)).toEqual(['b', 'a'])
  })

  it('keeps the server row when the write already landed: one row per id', () => {
    const queued = [
      {
        id: 'a',
        amount: 999,
      },
    ]

    expect(mergeQueued(server, queued)).toEqual(server)
  })
})

describe('summarizeQueue', () => {
  it('online with nothing waiting is synced', () => {
    expect(summarizeQueue(['synced'], true)).toEqual({
      state: 'synced',
      count: 0,
    })
  })

  it('offline counts every unsent write', () => {
    expect(summarizeQueue(['pending', 'pending'], false)).toEqual({
      state: 'offline',
      count: 2,
    })
  })

  it('a conflict outranks errors and pending writes', () => {
    expect(summarizeQueue(['pending', 'error', 'conflict'], true)).toEqual({
      state: 'conflict',
      count: 1,
    })
  })
})
