'use client'

import { KeyRound } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useState } from 'react'
import { Banner } from '@/components/ui/banner.component'
import { Button } from '@/components/ui/button.component'
import { getBrowserSupabase } from '@/lib/supabase/browser-client'

export type ConsentView = {
  authorizationId: string
  clientName: string
  /** where the authorization code goes */
  redirectHost: string
  known: boolean
  scopes: string[]
  email: string
}

type ConsentCardProps = {
  consent: ConsentView
}

type DetailProps = {
  label: string
  value: string
}

function Detail({ label, value }: DetailProps) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border py-3 last:border-b-0">
      <dt className="text-label text-text-secondary">{label}</dt>
      <dd className="text-right text-label font-medium break-all text-text-primary">{value}</dd>
    </div>
  )
}

// Figma «Saldo» → AI access consent 42:115042 / 42:115731 (normal), 42:115633 / 42:115775 (a client Saldo does not know:
// the Warning banner and only «Deny»), 42:115687 / 42:115821 (invalid, page.tsx). On the phone «Allow» sits above «Deny».
// Allow and Deny go to Supabase Auth from the browser with the person's own session; Auth then sends the browser to
// the client's redirect_uri with the code (or the denial).
export function OAuthConsentCard({ consent }: ConsentCardProps) {
  const translate = useTranslations('auth.consent')
  const [pending, setPending] = useState(false)
  const [failed, setFailed] = useState(false)

  async function decide(approve: boolean) {
    setPending(true)
    setFailed(false)

    const oauth = getBrowserSupabase().auth.oauth
    const options = { skipBrowserRedirect: true }
    const { data, error } = approve
      ? await oauth.approveAuthorization(consent.authorizationId, options)
      : await oauth.denyAuthorization(consent.authorizationId, options)

    if (error || !data) {
      setFailed(true)
      setPending(false)

      return
    }

    window.location.assign(data.redirect_url)
  }

  return (
    <div className="flex w-full flex-col gap-5 rounded-card bg-card p-5 shadow-card md:w-110 md:p-8">
      <span className="flex size-10 items-center justify-center self-center rounded-full bg-cat-blue-soft text-cat-blue-text">
        <KeyRound aria-hidden size={20} />
      </span>
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="font-display text-number-sm text-text-primary">{translate('title')}</h1>
        <p className="text-body text-text-secondary">{translate('body', { client: consent.clientName })}</p>
      </div>
      <dl className="flex flex-col">
        <Detail label={translate('client')} value={consent.clientName} />
        <Detail label={translate('redirect')} value={consent.redirectHost} />
        <Detail label={translate('scopes')} value={consent.scopes.join(', ') || '—'} />
        <Detail label={translate('account')} value={consent.email} />
      </dl>
      {consent.known ? (
        <p className="text-caption text-text-tertiary">{translate('note')}</p>
      ) : (
        <Banner kind="warning">{translate('unknownRedirect', { host: consent.redirectHost })}</Banner>
      )}
      {failed ? <Banner kind="danger">{translate('failed')}</Banner> : null}
      <div className="flex flex-col-reverse gap-3 md:flex-row">
        <Button variant="secondary" className="w-full md:flex-1" disabled={pending} onClick={() => decide(false)}>
          {translate('deny')}
        </Button>
        {consent.known ? (
          <Button className="w-full md:flex-1" disabled={pending} onClick={() => decide(true)}>
            {translate('allow')}
          </Button>
        ) : null}
      </div>
    </div>
  )
}
