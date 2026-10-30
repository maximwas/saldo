import { describe, expect, it } from 'vitest'
import { resolveLocale } from './locale.utils'

describe('resolveLocale', () => {
  it('prefers user_settings over the cookie and the header', () => {
    expect(
      resolveLocale({
        settingsLocale: 'en',
        cookieLocale: 'uk',
        acceptLanguage: 'uk',
      }),
    ).toBe('en')
  })

  it('takes the cookie when settings are missing or hold an unknown value', () => {
    expect(
      resolveLocale({
        settingsLocale: null,
        cookieLocale: 'en',
        acceptLanguage: 'uk',
      }),
    ).toBe('en')
    expect(
      resolveLocale({
        settingsLocale: 'uk-UA',
        cookieLocale: 'en',
      }),
    ).toBe('en')
  })

  it('negotiates Accept-Language by quality and matches region tags to the language', () => {
    expect(
      resolveLocale({
        cookieLocale: 'de',
        acceptLanguage: 'de-DE,en-US;q=0.8,uk;q=0.5',
      }),
    ).toBe('en')
    expect(resolveLocale({ acceptLanguage: 'uk-UA,uk;q=0.9,en;q=0.8' })).toBe('uk')
  })

  it('falls back to uk', () => {
    expect(resolveLocale({ acceptLanguage: 'de,fr;q=0.5' })).toBe('uk')
    expect(resolveLocale({})).toBe('uk')
  })
})
