import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { Brand } from '@/components/layout/brand.component'
import { type ConsentView, OAuthConsentCard } from '@/features/auth/components/oauth-consent-card.component'
import { isKnownRedirect, redirectHost } from '@/features/auth/utils/oauth-redirect.utils'
import { getServerSupabase } from '@/lib/supabase/server-client'

export async function generateMetadata(): Promise<Metadata> {
  const translate = await getTranslations('auth.consent')

  return { title: translate('metaTitle') }
}

type ConsentLookup = { consent: ConsentView } | { redirectTo: string } | null

// Supabase OAuth 2.1 server sends the browser here with ?authorization_id= (config authorization_url_path); src/proxy.ts
// has already sent a signed-out person to /login?next= and back. An approved client skips the card (redirect_url).
async function lookUp(authorizationId: string | undefined): Promise<ConsentLookup> {
  if (!authorizationId) {
    return null
  }

  const supabase = await getServerSupabase()
  const { data, error } = await supabase.auth.oauth.getAuthorizationDetails(authorizationId)

  if (error || !data) {
    return null
  }

  if (!('authorization_id' in data)) {
    return { redirectTo: data.redirect_url }
  }

  return {
    consent: {
      authorizationId: data.authorization_id,
      clientName: data.client.name || data.client.id,
      redirectHost: redirectHost(data.redirect_uri),
      known: isKnownRedirect(data.redirect_uri),
      scopes: data.scope.split(' ').filter(Boolean),
      email: data.user.email,
    },
  }
}

export default async function OAuthConsentPage({ searchParams }: PageProps<'/oauth/consent'>) {
  const { authorization_id: authorizationId } = await searchParams
  const found = await lookUp(typeof authorizationId === 'string' ? authorizationId : undefined)

  if (found && 'redirectTo' in found) {
    // the client's own redirect_uri with the code: an external URL, which typedRoutes does not know as a Route
    redirect(found.redirectTo as never)
  }

  const translate = await getTranslations('auth.consent')

  return (
    <main className="flex min-h-dvh flex-col items-center gap-6 bg-app px-5 pt-16 pb-8 md:justify-center-safe md:py-8">
      <Brand />
      {found ? (
        <OAuthConsentCard consent={found.consent} />
      ) : (
        <div className="flex w-full flex-col gap-2 rounded-card bg-card p-5 text-center shadow-card md:w-110 md:p-8">
          <h1 className="font-display text-number-sm text-text-primary">{translate('invalidTitle')}</h1>
          <p className="text-body text-text-secondary">{translate('invalidBody')}</p>
        </div>
      )}
    </main>
  )
}
