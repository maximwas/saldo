import 'server-only'
import { logger } from '@/lib/logger/logger.server'
import { getServerSupabase } from '@/lib/supabase/server-client'

const log = logger.child({
  module: 'oauth-grants',
})

export type OAuthGrantView = {
  clientId: string
  clientName: string
  clientUri: string | null
  scopes: string[]
  grantedAt: string
}

/** the AI clients the signed-in person allowed (Supabase OAuth 2.1 server); none while the server is off */
export async function listOAuthGrants(): Promise<OAuthGrantView[]> {
  const supabase = await getServerSupabase()
  const { data, error } = await supabase.auth.oauth.listGrants()

  if (error) {
    log.warn(
      {
        code: error.code ?? error.name,
      },
      'oauth grants lookup failed',
    )

    return []
  }

  return data.map((grant) => ({
    clientId: grant.client.id,
    clientName: grant.client.name || grant.client.id,
    clientUri: grant.client.uri || null,
    scopes: grant.scopes,
    grantedAt: grant.granted_at,
  }))
}
