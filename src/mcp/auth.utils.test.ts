import { describe, expect, it } from 'vitest'
import { type TokenClaims, toAuthInfo } from './auth.utils'

const ISSUER = 'http://127.0.0.1:54321/auth/v1'
const NOW = 1_800_000_000
const context = {
  issuer: ISSUER,
  nowSeconds: NOW,
}
const valid: TokenClaims = {
  iss: ISSUER,
  sub: '00000000-0000-4000-8000-000000000001',
  role: 'authenticated',
  exp: NOW + 600,
  client_id: 'c0ffee00-0000-4000-8000-000000000001',
  scope: 'openid email',
}

describe('toAuthInfo', () => {
  it('accepts an OAuth client token of a signed-in person', () => {
    expect(toAuthInfo(valid, 'jwt', context)).toEqual({
      token: 'jwt',
      clientId: valid.client_id,
      scopes: ['openid', 'email'],
      expiresAt: NOW + 600,
      extra: { userId: valid.sub },
    })
  })

  it('refuses the app session: no client_id', () => {
    expect(
      toAuthInfo(
        {
          ...valid,
          client_id: undefined,
        },
        'jwt',
        context,
      ),
    ).toBeUndefined()
    expect(
      toAuthInfo(
        {
          ...valid,
          client_id: '',
        },
        'jwt',
        context,
      ),
    ).toBeUndefined()
  })

  it('refuses an expired token', () => {
    expect(
      toAuthInfo(
        {
          ...valid,
          exp: NOW,
        },
        'jwt',
        context,
      ),
    ).toBeUndefined()
    expect(
      toAuthInfo(
        {
          ...valid,
          exp: undefined,
        },
        'jwt',
        context,
      ),
    ).toBeUndefined()
  })

  it('refuses a token without a person or from another issuer', () => {
    expect(
      toAuthInfo(
        {
          ...valid,
          sub: undefined,
        },
        'jwt',
        context,
      ),
    ).toBeUndefined()
    expect(
      toAuthInfo(
        {
          ...valid,
          role: 'anon',
        },
        'jwt',
        context,
      ),
    ).toBeUndefined()
    expect(
      toAuthInfo(
        {
          ...valid,
          iss: 'https://other.supabase.co/auth/v1',
        },
        'jwt',
        context,
      ),
    ).toBeUndefined()
  })

  it('keeps an empty scope list when the token has none', () => {
    expect(
      toAuthInfo(
        {
          ...valid,
          scope: undefined,
        },
        'jwt',
        context,
      )?.scopes,
    ).toEqual([])
  })
})
