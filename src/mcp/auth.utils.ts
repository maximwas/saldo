import type { AuthInfo } from '@modelcontextprotocol/server'

/** the claims of a verified Supabase access token that the MCP server relies on */
export type TokenClaims = {
  iss?: string
  sub?: string
  role?: string
  exp?: number
  /** set only in a token of the Supabase OAuth 2.1 server: the app's own session has none */
  client_id?: string
  scope?: string
}

type LiveClientClaims = TokenClaims & {
  sub: string
  exp: number
  client_id: string
}

type TokenContext = {
  /** Supabase Auth issuer, `<project url>/auth/v1` */
  issuer: string
  /** seconds since the epoch */
  nowSeconds: number
}

const isFromOurAuth = (claims: TokenClaims, issuer: string) => claims.iss === issuer && claims.role === 'authenticated'

function isLiveClientToken(claims: TokenClaims, { issuer, nowSeconds }: TokenContext): claims is LiveClientClaims {
  return (
    isFromOurAuth(claims, issuer) &&
    typeof claims.sub === 'string' &&
    typeof claims.client_id === 'string' &&
    claims.client_id !== '' &&
    typeof claims.exp === 'number' &&
    claims.exp > nowSeconds
  )
}

/** a signed-in person's token issued to an OAuth client by our Auth and not expired, else undefined (401) */
export function toAuthInfo(claims: TokenClaims, token: string, context: TokenContext): AuthInfo | undefined {
  if (!isLiveClientToken(claims, context)) {
    return undefined
  }

  return {
    token,
    clientId: claims.client_id,
    scopes: (claims.scope ?? '').split(' ').filter(Boolean),
    expiresAt: claims.exp,
    extra: { userId: claims.sub },
  }
}
