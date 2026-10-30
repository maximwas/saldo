'use client'

import { LogOut, UserPlus } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useFormatter, useTranslations } from 'next-intl'
import { useState } from 'react'
import { Button } from '@/components/ui/button.component'
import { Card } from '@/components/ui/card.component'
import { Select } from '@/components/ui/select.component'
import { notify } from '@/components/ui/toaster.component'
import { useLedgerStore } from '@/contexts/ledger.context'
import { getBrowserSupabase } from '@/lib/supabase/browser-client'
import { toPgError } from '@/lib/supabase/pg-error.utils'
import { cn } from '@/lib/utils/cn.utils'
import { cancelLedgerInvite, removeMember, setMemberRole } from '../api/access.api'
import type { Member, PendingInvite } from '../api/access.server'
import { INVITE_ROLES } from '../schemas/access.schema'
import { ConfirmSheet } from './confirm-sheet.component'
import { InviteSheet } from './invite-sheet.component'
import { MyRemindersCard } from './my-reminders-card.component'

type AccessScreenProps = {
  currentUserId: string
  members: Member[]
  invites: PendingInvite[]
}

type Dialog =
  | {
      kind: 'revoke'
      member: Member
    }
  | {
      kind: 'cancel'
      invite: PendingInvite
    }
  | { kind: 'leave' }
  | null

// Figma LetterAvatar Size=40 colours: tones differ per person, text/body-semibold on a soft fill
const AVATAR_TONES = [
  'bg-cat-blue-soft text-cat-blue-text',
  'bg-cat-pink-soft text-cat-pink-text',
  'bg-cat-orange-soft text-cat-orange-text',
  'bg-cat-green-soft text-cat-green-text',
]

const memberName = (member: Member) => member.name ?? member.email?.split('@')[0] ?? '—'

type AvatarProps = {
  name: string
  index: number
}

function Avatar({ name, index }: AvatarProps) {
  return (
    <span
      aria-hidden
      className={cn(
        'flex size-10 shrink-0 items-center justify-center rounded-md text-body font-semibold',
        AVATAR_TONES[index % AVATAR_TONES.length],
      )}
    >
      {name.charAt(0).toUpperCase()}
    </span>
  )
}

// Figma «Saldo» → Settings, Access tab 2:30818: Card Members (intro + Invite, rows: avatar, name + email,
// role 200, action 180) and Card Pending invites; to the right Card Roles (400). The viewer frame
// 2:46979 adds an info line on top and Leave space in place of Invite.
export function AccessScreen({ currentUserId, members, invites }: AccessScreenProps) {
  const ledgerId = useLedgerStore((ledger) => ledger.ledgerId)
  const role = useLedgerStore((ledger) => ledger.role)
  const ledgerName = useLedgerStore((ledger) => ledger.ledgers.find((item) => item.id === ledger.ledgerId)?.name ?? '')
  const router = useRouter()
  const translate = useTranslations('settings.access')
  const translateError = useTranslations('errors.db')
  const formatter = useFormatter()
  const [inviteOpen, setInviteOpen] = useState(false)
  const [dialog, setDialog] = useState<Dialog>(null)
  const [isPending, setIsPending] = useState(false)
  const [dialogError, setDialogError] = useState<string | null>(null)
  const isOwner = role === 'owner'
  const owner = members.find((member) => member.role === 'owner')
  const ownerName = owner ? memberName(owner) : '—'
  const roleOptions = INVITE_ROLES.map((value) => ({
    value,
    label: translate(`roles.${value}`),
  }))
  const day = (iso: string, withYear: boolean) =>
    formatter.dateTime(new Date(iso), {
      day: '2-digit',
      month: '2-digit',
      year: withYear ? 'numeric' : undefined,
    })

  function closeDialog() {
    setDialog(null)
    setDialogError(null)
  }

  // one place for every write: the error text comes from errors.db, success refreshes the server data
  async function run(action: () => Promise<void>, onDone: () => void) {
    setIsPending(true)
    setDialogError(null)

    try {
      await action()
      onDone()
      router.refresh()
    } catch (caught) {
      const message = translateError(toPgError(caught as { code?: string }).kind)

      setDialogError(message)
      notify.error(message)
    } finally {
      setIsPending(false)
    }
  }

  const changeRole = (member: Member, nextRole: string | null) => {
    if (nextRole === null || nextRole === member.role) {
      return
    }

    void run(
      () =>
        setMemberRole(getBrowserSupabase(), {
          ledgerId,
          userId: member.userId,
          role: nextRole as (typeof INVITE_ROLES)[number],
        }),
      () => notify.success(translate('roleChanged')),
    )
  }

  const confirm = () => {
    if (!dialog) {
      return
    }

    const supabase = getBrowserSupabase()

    if (dialog.kind === 'revoke') {
      void run(
        () =>
          removeMember(supabase, {
            ledgerId,
            userId: dialog.member.userId,
          }),
        () => {
          closeDialog()
          notify.success(translate('revokeSheet.done'))
        },
      )
    } else if (dialog.kind === 'cancel') {
      void run(
        () => cancelLedgerInvite(supabase, dialog.invite.id, new Date()),
        () => {
          closeDialog()
          notify.success(translate('cancelSheet.done'))
        },
      )
    } else {
      // the active-space cookie still names this space; the server falls back to another one the person belongs to
      void run(
        () =>
          removeMember(supabase, {
            ledgerId,
            userId: currentUserId,
          }),
        () => {
          closeDialog()
          router.replace('/')
        },
      )
    }
  }

  const revokeName = dialog?.kind === 'revoke' ? memberName(dialog.member) : ''

  return (
    <div className="flex flex-col gap-4 lg:gap-6">
      {isOwner ? null : (
        <p className="flex items-center gap-3 rounded-inner bg-primary-soft px-4 py-3 text-label text-primary-text">
          {translate('notice', {
            space: ledgerName,
            role: translate(`roles.${role}`),
            owner: ownerName,
          })}
        </p>
      )}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-6">
        <div className="flex min-w-0 flex-1 flex-col gap-4 lg:gap-6">
          <Card title={translate('membersTitle')}>
            <div className="flex flex-wrap items-center gap-4 pb-2">
              <p className="min-w-0 flex-1 basis-60 text-label text-text-secondary">
                {translate(isOwner ? 'ownerIntro' : 'memberIntro', { space: ledgerName })}
              </p>
              {isOwner ? (
                <Button type="button" className="cursor-pointer" onClick={() => setInviteOpen(true)}>
                  <UserPlus aria-hidden className="size-5" />
                  {translate('invite')}
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="secondary"
                  className="cursor-pointer"
                  onClick={() => setDialog({ kind: 'leave' })}
                >
                  <LogOut aria-hidden className="size-5" />
                  {translate('leave')}
                </Button>
              )}
            </div>
            <ul className="flex flex-col">
              {members.map((member, index) => {
                const name = memberName(member)
                const isYou = member.userId === currentUserId
                const canManage = isOwner && member.role !== 'owner'

                return (
                  <li
                    key={member.userId}
                    className="flex flex-wrap items-center gap-x-4 gap-y-3 border-b border-border py-4 last:border-b-0"
                  >
                    <Avatar name={name} index={index} />
                    <div className="flex min-w-0 flex-1 flex-col basis-40">
                      <span className="truncate text-body font-semibold text-text-primary">
                        {isYou ? translate('you', { name }) : name}
                      </span>
                      <span className="text-caption text-text-tertiary">
                        {translate('since', {
                          email: member.email ?? '—',
                          date: day(member.joinedAt, true),
                        })}
                      </span>
                    </div>
                    <div className="basis-full sm:w-50 sm:basis-auto">
                      {canManage ? (
                        <Select
                          aria-label={translate('roleLabel', { name })}
                          options={roleOptions}
                          value={member.role}
                          disabled={isPending}
                          onValueChange={(value) => changeRole(member, value)}
                        />
                      ) : (
                        <span className="text-label sm:px-4 font-medium text-text-secondary">
                          {translate(`roles.${member.role}`)}
                        </span>
                      )}
                    </div>
                    {canManage ? (
                      <Button
                        type="button"
                        variant="ghost"
                        className="cursor-pointer sm:w-45"
                        onClick={() =>
                          setDialog({
                            kind: 'revoke',
                            member,
                          })
                        }
                      >
                        {translate('revoke')}
                      </Button>
                    ) : (
                      <span className="hidden sm:block sm:w-45" />
                    )}
                  </li>
                )
              })}
            </ul>
          </Card>
          <MyRemindersCard currentUserId={currentUserId} />
          {isOwner && invites.length > 0 ? (
            <Card title={translate('pendingTitle')}>
              <ul className="flex flex-col gap-4">
                {invites.map((invite, index) => (
                  <li key={invite.id} className="flex flex-wrap items-center gap-x-4 gap-y-3">
                    <Avatar name={invite.email} index={index + 2} />
                    <div className="flex min-w-0 flex-1 flex-col basis-40">
                      <span className="truncate text-body font-semibold text-text-primary">{invite.email}</span>
                      <span className="text-caption text-text-tertiary">
                        {translate('pendingMeta', {
                          role: translate(`roles.${invite.role}`),
                          sent: day(invite.createdAt, false),
                          until: day(invite.expiresAt, false),
                        })}
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      className="cursor-pointer"
                      onClick={() =>
                        setDialog({
                          kind: 'cancel',
                          invite,
                        })
                      }
                    >
                      {translate('cancelInvite')}
                    </Button>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}
        </div>
        <Card title={translate('rolesCardTitle')} className="lg:w-100 lg:shrink-0">
          <dl className="flex flex-col gap-4">
            {(['owner', ...INVITE_ROLES] as const).map((value) => (
              <div key={value} className="flex flex-col gap-1">
                <dt className="text-body font-semibold text-text-primary">{translate(`roles.${value}`)}</dt>
                <dd className="text-label text-text-secondary">{translate(`roleHints.${value}`)}</dd>
              </div>
            ))}
          </dl>
        </Card>
      </div>
      <InviteSheet open={inviteOpen} onOpenChange={setInviteOpen} />
      <ConfirmSheet
        open={dialog?.kind === 'revoke'}
        onOpenChange={(open) => !open && closeDialog()}
        title={translate('revokeSheet.title', { name: revokeName })}
        body={translate('revokeSheet.body', {
          name: revokeName,
          space: ledgerName,
        })}
        note={translate('revokeSheet.again', { name: revokeName })}
        keepLabel={translate('revokeSheet.keep')}
        confirmLabel={translate('revokeSheet.confirm')}
        onConfirm={confirm}
        pending={isPending}
        error={dialogError}
      />
      <ConfirmSheet
        open={dialog?.kind === 'cancel'}
        onOpenChange={(open) => !open && closeDialog()}
        title={translate('cancelSheet.title', { email: dialog?.kind === 'cancel' ? dialog.invite.email : '' })}
        body={translate('cancelSheet.body')}
        keepLabel={translate('cancelSheet.keep')}
        confirmLabel={translate('cancelSheet.confirm')}
        onConfirm={confirm}
        pending={isPending}
        error={dialogError}
      />
      <ConfirmSheet
        open={dialog?.kind === 'leave'}
        onOpenChange={(open) => !open && closeDialog()}
        title={translate('leaveSheet.title', { space: ledgerName })}
        body={translate('leaveSheet.body', { owner: ownerName })}
        keepLabel={translate('leaveSheet.keep')}
        confirmLabel={translate('leaveSheet.confirm')}
        onConfirm={confirm}
        pending={isPending}
        error={dialogError}
      />
    </div>
  )
}
