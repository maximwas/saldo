'use client'

import { Bot } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useFormatter, useTranslations } from 'next-intl'
import { useState } from 'react'
import { Button } from '@/components/ui/button.component'
import { Card } from '@/components/ui/card.component'
import { notify } from '@/components/ui/toaster.component'
import { getBrowserSupabase } from '@/lib/supabase/browser-client'
import type { OAuthGrantView } from '../api/oauth-grants.server'

type AiAccessCardProps = {
  grants: OAuthGrantView[]
  mcpUrl: string
}

type GrantRowProps = {
  grant: OAuthGrantView
  onRevokeAction: (clientId: string) => void
  pending: boolean
}

function GrantRow({ grant, onRevokeAction, pending }: GrantRowProps) {
  const translate = useTranslations('settings.security')
  const formatter = useFormatter()

  return (
    <li className="flex items-center gap-3 border-b border-border py-3 last:border-b-0">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-subtle text-text-secondary">
        <Bot aria-hidden size={20} />
      </span>
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-body font-medium text-text-primary">{grant.clientName}</span>
        <span className="text-caption text-text-tertiary">
          {translate('grantedAt', {
            date: formatter.dateTime(new Date(grant.grantedAt), {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
            }),
          })}
        </span>
      </div>
      <Button variant="secondary" disabled={pending} onClick={() => onRevokeAction(grant.clientId)}>
        {translate('revoke')}
      </Button>
    </li>
  )
}

// No Figma frame for the card yet (a Figma gap, plan 10.4): the house Card with the row pattern of Settings → Access.
// Revoking deletes the client's sessions in Supabase Auth; /api/mcp checks the session on every call, so it stops now.
export function AiAccessCard({ grants, mcpUrl }: AiAccessCardProps) {
  const translate = useTranslations('settings.security')
  const router = useRouter()
  const [pendingId, setPendingId] = useState<string | null>(null)

  async function revoke(clientId: string) {
    setPendingId(clientId)

    const { error } = await getBrowserSupabase().auth.oauth.revokeGrant({ clientId })

    setPendingId(null)

    if (error) {
      notify.error(translate('revokeFailed'))

      return
    }

    notify.success(translate('revoked'))
    router.refresh()
  }

  return (
    <Card title={translate('aiTitle')}>
      <p className="text-label text-text-secondary">{translate('aiHint', { url: mcpUrl })}</p>
      {grants.length === 0 ? (
        <p className="text-label text-text-tertiary">{translate('empty')}</p>
      ) : (
        <ul className="flex flex-col">
          {grants.map((grant) => (
            <GrantRow
              key={grant.clientId}
              grant={grant}
              onRevokeAction={revoke}
              pending={pendingId === grant.clientId}
            />
          ))}
        </ul>
      )}
    </Card>
  )
}
