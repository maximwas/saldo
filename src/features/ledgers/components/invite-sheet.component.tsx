'use client'

import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { type SubmitEvent, useState } from 'react'
import { Button } from '@/components/ui/button.component'
import { Field } from '@/components/ui/field.component'
import { Input } from '@/components/ui/input.component'
import { Select } from '@/components/ui/select.component'
import { Sheet, useIsDesktop } from '@/components/ui/sheet.component'
import { notify } from '@/components/ui/toaster.component'
import { useLedgerStore } from '@/contexts/ledger.context'
import { getBrowserSupabase } from '@/lib/supabase/browser-client'
import { toPgError } from '@/lib/supabase/pg-error.utils'
import { createLedgerInvite } from '../api/access.api'
import { createInviteInputSchema, INVITE_ROLES } from '../schemas/access.schema'
import { createInviteToken, hashInviteToken } from '../utils/invite.utils'

type InviteRole = (typeof INVITE_ROLES)[number]

type InviteSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

// The address of the invite: empty, then the domain the frame 2:45091 asks for, then anything else zod rejects
function emailIssue(email: string): 'required' | 'noDomain' | 'invalid' | null {
  if (email === '') {
    return 'required'
  }

  if (createInviteInputSchema.shape.email.safeParse(email).success) {
    return null
  }

  const [local, domain] = email.split('@')

  return local && !domain?.includes('.') ? 'noDomain' : 'invalid'
}

// Figma «Saldo» → Settings · Invite: Dialog 2:36155 (title with the space, roles box with the note, «Create link») /
// BottomSheet 2:45017 (title without it, no note, «Create»); Email and Role required, the email errors under the field
// (2:45091 no domain, 32:94877 no Saldo account, 32:95165 already a member), offline 2:46755: the dialog closes and a
// toast says so. The link step after it has no frame: a read-only Input and one «Copy link» button.
export function InviteSheet({ open, onOpenChange }: InviteSheetProps) {
  const router = useRouter()
  const ledgerId = useLedgerStore((ledger) => ledger.ledgerId)
  const ledgerName = useLedgerStore((ledger) => ledger.ledgers.find((item) => item.id === ledger.ledgerId)?.name ?? '')
  const translate = useTranslations('settings.access')
  const translateError = useTranslations('errors.db')
  const translateField = useTranslations('errors')
  const isDesktop = useIsDesktop()
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<InviteRole>('viewer')
  const [emailError, setEmailError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)
  // the token lives only in this state: it is shown once and dropped when the sheet closes
  const [created, setCreated] = useState<{
    email: string
    link: string
  } | null>(null)
  const roleOptions = INVITE_ROLES.map((value) => ({
    value,
    label: translate(`roles.${value}`),
  }))

  function changeOpen(next: boolean) {
    onOpenChange(next)

    if (!next) {
      setCreated(null)
      setEmail('')
      setRole('viewer')
      setEmailError(null)
      setError(null)
    }
  }

  function emailMessage(issue: NonNullable<ReturnType<typeof emailIssue>>, address: string) {
    if (issue === 'required') {
      return translateField('required')
    }

    return issue === 'noDomain'
      ? translate('inviteSheet.emailNoDomain', { example: `${address.split('@')[0]}@example.com` })
      : translate('inviteSheet.emailInvalid')
  }

  async function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()

    const address = email.trim()
    const issue = emailIssue(address)

    if (issue) {
      setEmailError(emailMessage(issue, address))

      return
    }

    const token = createInviteToken()
    const parsed = createInviteInputSchema.parse({
      id: crypto.randomUUID(),
      ledgerId,
      email: address,
      role,
      tokenHash: await hashInviteToken(token),
    })

    setIsPending(true)
    setEmailError(null)
    setError(null)

    try {
      await createLedgerInvite(getBrowserSupabase(), parsed)
      setCreated({
        email: parsed.email,
        link: `${window.location.origin}/invite/${token}`,
      })
      router.refresh()
    } catch (caught) {
      const { code } = caught as { code?: string }

      // create_ledger_invite: SL404 no Saldo account with the email, SL409 already in the space (Figma 32:94877 / 32:95165)
      if (code === 'SL404' || code === 'SL409') {
        setEmailError(translate(code === 'SL404' ? 'inviteSheet.noAccount' : 'inviteSheet.alreadyMember'))
      } else if (!code) {
        // no Postgres code: the request never reached the server
        changeOpen(false)
        notify.error(translate('inviteSheet.offline'))
      } else {
        setError(translateError(toPgError({ code }).kind))
      }
    } finally {
      setIsPending(false)
    }
  }

  async function copy(link: string) {
    try {
      await navigator.clipboard.writeText(link)
      notify.success(translate('inviteSheet.copied'))
    } catch {
      notify.error(translate('inviteSheet.copyFailed'))
    }
  }

  if (created) {
    return (
      <Sheet
        open={open}
        onOpenChange={changeOpen}
        title={translate('inviteSheet.doneTitle', { email: created.email })}
        footer={
          <>
            <Button type="button" variant="secondary" onClick={() => changeOpen(false)}>
              {translate('inviteSheet.done')}
            </Button>
            <Button type="button" onClick={() => copy(created.link)}>
              {translate('inviteSheet.copy')}
            </Button>
          </>
        }
      >
        <p className="text-body text-text-secondary">{translate('inviteSheet.doneHint')}</p>
        <Field label={translate('inviteSheet.linkLabel')}>
          <Input readOnly value={created.link} onFocus={(event) => event.currentTarget.select()} />
        </Field>
      </Sheet>
    )
  }

  return (
    <Sheet
      open={open}
      onOpenChange={changeOpen}
      title={isDesktop ? translate('inviteSheet.title', { space: ledgerName }) : translate('inviteSheet.titleMobile')}
      footer={
        <>
          <Button type="button" variant="secondary" onClick={() => changeOpen(false)}>
            {translate('inviteSheet.cancel')}
          </Button>
          <Button type="submit" form="invite-form" disabled={isPending}>
            {translate(isDesktop ? 'inviteSheet.submit' : 'inviteSheet.submitMobile')}
          </Button>
        </>
      }
    >
      <form id="invite-form" onSubmit={submit} noValidate className="flex flex-col gap-4">
        <Field
          label={translate('inviteSheet.email')}
          required
          hint={translate('inviteSheet.emailHint')}
          error={emailError ?? undefined}
        >
          <Input
            type="email"
            autoComplete="off"
            autoFocus
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </Field>
        <Field label={translate('inviteSheet.role')} required>
          <Select
            options={roleOptions}
            value={role}
            onValueChange={(value) => setRole((value as InviteRole) ?? 'viewer')}
          />
        </Field>
        <div className="flex flex-col gap-3 rounded-inner bg-subtle p-4">
          {INVITE_ROLES.map((value) => (
            <div key={value} className="flex flex-col gap-0.5">
              <span className="text-label font-semibold text-text-primary">{translate(`roles.${value}`)}</span>
              <span className="text-caption text-text-secondary">{translate(`inviteSheet.roleHints.${value}`)}</span>
            </div>
          ))}
          {isDesktop ? <p className="text-caption text-text-tertiary">{translate('inviteSheet.roleNote')}</p> : null}
        </div>
        {error ? (
          <p role="alert" className="text-caption text-negative-text">
            {error}
          </p>
        ) : null}
      </form>
    </Sheet>
  )
}
