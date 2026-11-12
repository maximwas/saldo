import 'server-only'
import type { AuthInfo } from '@modelcontextprotocol/server'
import { env } from '@/lib/env'
import { createTokenSupabase } from '@/lib/supabase/token-client.server'
import { type TokenClaims, toAuthInfo } from './auth.utils'

/** issuer of the Supabase Auth OAuth 2.1 server: the authorization server of the protected resource metadata */
export const supabaseAuthIssuer = () => `${env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1`

/**
 * withMcpAuth's verifyToken: getClaims checks the signature and expiry, toAuthInfo that it is an OAuth client's token;
 * getUser then asks Auth whether the session still exists, because revoking a grant in Settings deletes the client's
 * sessions while its last access token would stay valid until it expires
 */
export async function verifySupabaseToken(_request: Request, bearerToken?: string): Promise<AuthInfo | undefined> {
  if (!bearerToken) {
    return undefined
  }

  const supabase = createTokenSupabase(bearerToken)
  const { data, error } = await supabase.auth.getClaims(bearerToken)

  if (error || !data) {
    return undefined
  }

  const authInfo = toAuthInfo(data.claims as TokenClaims, bearerToken, {
    issuer: supabaseAuthIssuer(),
    nowSeconds: Date.now() / 1000,
  })

  if (!authInfo) {
    return undefined
  }

  const { error: sessionError } = await supabase.auth.getUser(bearerToken)

  return sessionError ? undefined : authInfo
}
