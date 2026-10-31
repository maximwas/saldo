'use client'

import { ArrowLeftRight, CircleCheck, Link2Off, MailX } from 'lucide-react'
import type { Route } from 'next'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useFormatter, useTranslations } from 'next-intl'
import { type ReactNode, useState } from 'react'
import { Banner } from '@/components/ui/banner.component'
import { Button } from '@/components/ui/button.component'
import { getBrowserSupabase } from '@/lib/supabase/browser-client'
import { toPgError } from '@/lib/supabase/pg-error.utils'
import { cn } from '@/lib/utils/cn.utils'
import { switchLedger } from '../api/ledgers.actions'
import { acceptLedgerInvite } from '../api/ledgers.api'
import { type InviteStatus, type InviteView, inviteStatusFromError } from '../utils/invite.utils'

type InviteCardProps = {
  token: string
  status: InviteStatus
  invite: InviteView | null
  sessionEmail: string | null
}

type LetterAvatarProps = {
  name: string
  tone: 'blue' | 'green'
}

// Figma LetterAvatar Size=40: radius md, text/body-semibold
function LetterAvatar({ name, tone }: LetterAvatarProps) {
  return (
    <span
      aria-hidden
      className={cn(
        'flex size-10 items-center justify-center rounded-md text-body font-semibold',
        tone === 'blue' ? 'bg-cat-blue-soft text-cat-blue-text' : 'bg-cat-green-soft text-cat-green-text',
      )}
    >
      {name.charAt(0).toUpperCase()}
    </span>
  )
}

type StateIconProps = {
  tone: 'green' | 'neutral'
  children: ReactNode
}

// Figma CategoryIcon Size=40: round, icon 20
function StateIcon({ tone, children }: StateIconProps) {
  return (
    <span
      aria-hidden
      className={cn(
        'flex size-10 items-center justify-center rounded-full',
        tone === 'green' ? 'bg-cat-green-soft text-cat-green-text' : 'bg-subtle text-text-secondary',
      )}
    >
      {children}
    </span>
  )
}

type HeadingProps = {
  title: string
  body: string
}

function Heading({ title, body }: HeadingProps) {
  return (
    <div className="flex w-full flex-col items-center gap-2 text-center">
      <h1 className="font-display text-number-sm text-text-primary">{title}</h1>
      <p className="text-body text-text-secondary">{body}</p>
    </div>
  )
}

// Figma «Saldo» → Invite card 2:47557 (desktop 480, padding 32) / 2:49217 (mobile, padding 24), gap 24. Only people
// with a Saldo account are invited (create_ledger_invite SL404), so a signed-out person signs in first: «Accept» leads to
// the login with ?next= back here, the caption names the invited address.
export function InviteCard({ token, status: initialStatus, invite, sessionEmail }: InviteCardProps) {
  const router = useRouter()
  const translate = useTranslations('auth.invite')
  const translateShell = useTranslations('shell')
  const formatter = useFormatter()
  const [status, setStatus] = useState(initialStatus)
  const [failed, setFailed] = useState(false)
  const [isPending, setIsPending] = useState(false)
  const loginHref = `/login?next=${encodeURIComponent(`/invite/${token}`)}` as Route
  const day = (iso: string) =>
    formatter.dateTime(new Date(iso), {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })

  function start() {
    setIsPending(true)
    setFailed(false)
  }

  async function openSpace(ledgerId: string) {
    await switchLedger(ledgerId)
    router.replace('/')
    router.refresh()
  }

  // P0002 / PT410 / 42501 turn the card into its state; anything else (network) keeps it and shows the banner
  async function accept() {
    try {
      await openSpace(await acceptLedgerInvite(getBrowserSupabase(), token))
    } catch (caught) {
      const next = inviteStatusFromError(toPgError(caught as { code?: string }).kind)

      if (next) {
        setStatus(next)
      } else {
        setFailed(true)
      }

      setIsPending(false)
    }
  }

  async function signInAnother() {
    start()
    await getBrowserSupabase().auth.signOut()
    router.replace(loginHref)
  }

  const accountEmail = sessionEmail ?? invite?.email
  const account = accountEmail ? (
    <p className="w-full text-center text-caption text-text-tertiary">
      {translate('signedInAs', {
        email: accountEmail,
      })}
    </p>
  ) : null
  const toSaldo = (
    <Button variant="secondary" className="w-full" render={<Link href="/" />} nativeButton={false}>
      {translate('toSaldo')}
    </Button>
  )
  let body: ReactNode

  if (status === 'open' && invite) {
    const role = translateShell(`roles.${invite.role}`)
    const inviter = invite.inviterName ?? invite.inviterEmail

    body = (
      <>
        <div className="flex items-center gap-2">
          <LetterAvatar name={inviter ?? invite.ledgerName} tone="blue" />
          <ArrowLeftRight aria-hidden size={20} className="text-text-primary" />
          <LetterAvatar name={invite.ledgerName} tone="green" />
        </div>
        <Heading
          title={
            inviter
              ? translate('title', {
                  inviter,
                  space: invite.ledgerName,
                  role,
                })
              : translate('titleNoInviter', {
                  space: invite.ledgerName,
                  role,
                })
          }
          body={translate(invite.role === 'viewer' ? 'bodyViewer' : 'bodyEditor')}
        />
        <dl className="flex w-full flex-col gap-3 rounded-inner bg-subtle p-4 text-label">
          {[
            [translate('space'), invite.ledgerName],
            [translate('role'), role],
            [translate('from'), invite.inviterEmail],
            [translate('validUntil'), day(invite.expiresAt)],
          ].map(([label, value]) =>
            value ? (
              <div key={label} className="flex justify-between gap-3">
                <dt className="text-text-secondary">{label}</dt>
                <dd className="truncate font-semibold text-text-primary">{value}</dd>
              </div>
            ) : null,
          )}
        </dl>
        <div className="flex w-full gap-3">
          <Button variant="secondary" className="flex-1" render={<Link href="/" />} nativeButton={false}>
            {translate('decline')}
          </Button>
          {sessionEmail ? (
            <Button
              className="flex-1"
              disabled={isPending}
              onClick={() => {
                start()
                void accept()
              }}
            >
              {translate(failed ? 'retry' : 'accept')}
            </Button>
          ) : (
            <Button className="flex-1" render={<Link href={loginHref} />} nativeButton={false}>
              {translate('accept')}
            </Button>
          )}
        </div>
        {account}
      </>
    )
  } else if (status === 'accepted' && invite) {
    const accepted = invite.acceptedAt ? new Date(invite.acceptedAt) : new Date()

    body = (
      <>
        <StateIcon tone="green">
          <CircleCheck size={20} />
        </StateIcon>
        <Heading
          title={translate('acceptedTitle', {
            space: invite.ledgerName,
          })}
          body={translate('acceptedBody', {
            date: day(accepted.toISOString()),
            time: formatter.dateTime(accepted, {
              hour: '2-digit',
              minute: '2-digit',
            }),
          })}
        />
        {sessionEmail ? (
          <Button
            className="w-full"
            disabled={isPending}
            onClick={() => {
              start()
              void openSpace(invite.ledgerId).catch(() => {
                setFailed(true)
                setIsPending(false)
              })
            }}
          >
            {translate('open', {
              space: invite.ledgerName,
            })}
          </Button>
        ) : (
          <Button className="w-full" render={<Link href={loginHref} />} nativeButton={false}>
            {translate('open', {
              space: invite.ledgerName,
            })}
          </Button>
        )}
        {account}
      </>
    )
  } else if (status === 'otherEmail') {
    body = (
      <>
        <StateIcon tone="neutral">
          <MailX size={20} />
        </StateIcon>
        <Heading
          title={translate('otherEmailTitle')}
          body={translate('otherEmailBody', {
            email: invite?.email ?? '',
            current: sessionEmail ?? '',
          })}
        />
        <Button className="w-full" disabled={isPending} onClick={signInAnother}>
          {translate('otherAccount')}
        </Button>
      </>
    )
  } else {
    body = (
      <>
        <StateIcon tone="neutral">
          <Link2Off size={20} />
        </StateIcon>
        <Heading
          title={translate('invalidTitle')}
          body={translate(status === 'notFound' ? 'notFoundBody' : 'expiredBody')}
        />
        {toSaldo}
      </>
    )
  }

  return (
    <>
      {failed ? (
        <Banner kind="danger" role="alert" className="w-full md:w-120">
          {translate('failed')}
        </Banner>
      ) : null}
      <section className="flex w-full flex-col items-center gap-6 rounded-card bg-card p-6 shadow-card md:w-120 md:p-8">
        {body}
      </section>
    </>
  )
}
