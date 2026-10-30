import { describe, expect, it } from 'vitest'
import { needsHomeScreen, vapidKeyBytes } from './push.utils'

const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1'
const MAC = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1.15'

describe('needsHomeScreen', () => {
  it('asks an iPhone tab to add the app to the Home Screen', () => {
    expect(
      needsHomeScreen({
        userAgent: IPHONE,
        maxTouchPoints: 5,
        standalone: false,
      }),
    ).toBe(true)
  })

  it('leaves an installed iOS app alone', () => {
    expect(
      needsHomeScreen({
        userAgent: IPHONE,
        maxTouchPoints: 5,
        standalone: true,
      }),
    ).toBe(false)
  })

  it('recognises an iPad that reports a Mac, not a real Mac', () => {
    expect(
      needsHomeScreen({
        userAgent: MAC,
        maxTouchPoints: 5,
        standalone: false,
      }),
    ).toBe(true)
    expect(
      needsHomeScreen({
        userAgent: MAC,
        maxTouchPoints: 0,
        standalone: false,
      }),
    ).toBe(false)
  })
})

describe('vapidKeyBytes', () => {
  it('decodes base64url without padding', () => {
    expect([...vapidKeyBytes('AQID_w')]).toEqual([1, 2, 3, 255])
  })
})
