'use client'

import { Plug } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useFormatter, useTranslations } from 'next-intl'
import { useState } from 'react'
import { Banner } from '@/components/ui/banner.component'
import { Button } from '@/components/ui/button.component'
import { Card } from '@/components/ui/card.component'
import { Sheet, SheetClose, useIsDesktop } from '@/components/ui/sheet.component'
import { notify } from '@/components/ui/toaster.component'
import { getBrowserSupabase } from '@/lib/supabase/browser-client'
import type { OAuthGrantView } from '../api/oauth-grants.server'

type AiAccessCardProps = {
  grants: OAuthGrantView[]
  mcpUrl: string
}

type GrantRowProps = {
  grant: OAuthGrantView
  onRevokeAction: (grant: OAuthGrantView) => void
  pending: boolean
}

// Figma 42:115839: CategoryIcon neutral 40 with Icon/plug, name body-medium, «Access since» caption, Secondary M
function GrantRow({ grant, onRevokeAction, pending }: GrantRowProps) {
  const translate = useTranslations('settings.security')
  const formatter = useFormatter()

  return (
    <li className="flex items-center gap-3 border-b border-border py-3 last:border-b-0">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-subtle text-text-secondary">
        <Plug aria-hidden size={20} />
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
      <Button variant="secondary" disabled={pending} onClick={() => onRevokeAction(grant)}>
        {translate('revoke')}
      </Button>
    </li>
  )
}

// Figma «Saldo» → Settings, Security 42:115839 / 43:116322 (list), 43:116163 / 43:116509 (empty); «Revoke» asks first: Dialog
// 43:116607 (what happens and an Info banner) / BottomSheet 43:116795 (one shorter line). Revoking deletes the client's
// sessions in Supabase Auth; /api/mcp checks the session on every call, so it stops now.
export function AiAccessCard({ grants, mcpUrl }: AiAccessCardProps) {
  const translate = useTranslations('settings.security')
  const router = useRouter()
  const desktop = useIsDesktop()
  const [pending, setPending] = useState(false)
  // the grant stays after the sheet closes, so its name holds through the exit transition
  const [confirming, setConfirming] = useState<OAuthGrantView | null>(null)
  const [open, setOpen] = useState(false)
  const name = confirming?.clientName ?? ''

  function ask(grant: OAuthGrantView) {
    setConfirming(grant)
    setOpen(true)
  }

  async function revoke() {
    if (!confirming) {
      return
    }

    setPending(true)

    const { error } = await getBrowserSupabase().auth.oauth.revokeGrant({ clientId: confirming.clientId })

    setPending(false)

    if (error) {
      notify.error(translate('revokeFailed'))

      return
    }

    setOpen(false)
    notify.success(translate('revoked'))
    router.refresh()
  }

  return (
    <Card title={translate('aiTitle')}>
      {/* the Card body slot: gap 16 between the hint and the list */}
      <div className="flex flex-col gap-4">
        <p className="text-label text-text-secondary">{translate('aiHint', { url: mcpUrl })}</p>
        {grants.length === 0 ? (
          <p className="text-label text-text-tertiary">{translate('empty')}</p>
        ) : (
          <ul className="flex flex-col">
            {grants.map((grant) => (
              <GrantRow
                key={grant.clientId}
                grant={grant}
                onRevokeAction={ask}
                pending={pending && confirming?.clientId === grant.clientId}
              />
            ))}
          </ul>
        )}
      </div>
      <Sheet
        open={open}
        onOpenChange={setOpen}
        title={translate('revokeTitle', { name })}
        footer={
          <>
            <SheetClose>{translate('keep')}</SheetClose>
            <Button variant="danger" disabled={pending} onClick={() => void revoke()}>
              {translate('revokeConfirm')}
            </Button>
          </>
        }
      >
        {desktop ? (
          <>
            <p className="text-body text-text-secondary">{translate('revokeBody', { name })}</p>
            <Banner>{translate('revokeAgain', { name })}</Banner>
          </>
        ) : (
          <p className="text-body text-text-secondary">{translate('revokeBodyShort', { name })}</p>
        )}
      </Sheet>
    </Card>
  )
}
