import { describe, expect, it } from 'vitest'
import { safeNextPath } from './safe-next.utils'

describe('safeNextPath', () => {
  it('keeps a same-origin path with its query', () => {
    expect(safeNextPath('/oauth/consent?client_id=abc')).toBe('/oauth/consent?client_id=abc')
  })

  it.each([null, undefined, '', 'https://evil.example', '//evil.example', '/\\evil.example', 'javascript:alert(1)'])(
    'falls back to / for %s',
    (next) => {
      expect(safeNextPath(next)).toBe('/')
    },
  )
})
