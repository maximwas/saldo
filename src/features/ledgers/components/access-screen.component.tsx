'use client'

import { useQuery } from '@tanstack/react-query'
import { UserPlus, Users } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useFormatter, useTranslations } from 'next-intl'
import { useState } from 'react'
import { Banner } from '@/components/ui/banner.component'
import { Button } from '@/components/ui/button.component'
import { Card } from '@/components/ui/card.component'
import { Select } from '@/components/ui/select.component'
import { useIsDesktop } from '@/components/ui/sheet.component'
import { notify } from '@/components/ui/toaster.component'
import { useLedgerStore } from '@/contexts/ledger.context'
import { ledgerQueryKey } from '@/lib/query/query-keys.utils'
import { getBrowserSupabase } from '@/lib/supabase/browser-client'
import { toPgError } from '@/lib/supabase/pg-error.utils'
import { cn } from '@/lib/utils/cn.utils'
import { cancelLedgerInvite, getMemberContributions, removeMember, setMemberRole } from '../api/access.api'
import type { Member, PendingInvite } from '../api/access.server'
import { INVITE_ROLES } from '../schemas/access.schema'
import { memberName } from '../utils/members.utils'
import { ConfirmSheet } from './confirm-sheet.component'
import { InviteSheet } from './invite-sheet.component'
import { LeaveSpaceButton } from './leave-space-button.component'

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
  | null

// Figma LetterAvatar Size=40 colours: tones differ per person, text/body-semibold on a soft fill
const AVATAR_TONES = [
  'bg-cat-blue-soft text-cat-blue-text',
  'bg-cat-pink-soft text-cat-pink-text',
  'bg-cat-orange-soft text-cat-orange-text',
  'bg-cat-green-soft text-cat-green-text',
]

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

// Figma «Saldo» → Settings, Access tab 2:30818: Card Members (body gap 16: intro with 8 below + Invite, rows padding 16
// with a divider: avatar, name + email, role 200, action 180) and Card Pending invites; to the right Card Roles (400,
// as tall as the row). Read only 2:46979: Info Banner on top, Leave space in place of Invite, the own role a disabled
// Select. Only the owner in the space and no invites 2:46293: one Members card with the empty state.
export function AccessScreen({ currentUserId, members, invites }: AccessScreenProps) {
  const ledgerId = useLedgerStore((ledger) => ledger.ledgerId)
  const role = useLedgerStore((ledger) => ledger.role)
  const ledgerName = useLedgerStore((ledger) => ledger.ledgers.find((item) => item.id === ledger.ledgerId)?.name ?? '')
  const router = useRouter()
  const isDesktop = useIsDesktop()
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
  const revokeMember = dialog?.kind === 'revoke' ? dialog.member : null
  const revokeName = revokeMember ? memberName(revokeMember) : ''
  // the desktop dialog counts what the person entered (2:36442); the mobile sheet 2:45498 does not
  const contributions = useQuery({
    queryKey: ledgerQueryKey('ledger-members', ledgerId, 'contributions', revokeMember?.userId),
    queryFn: () => getMemberContributions(getBrowserSupabase(), ledgerId, revokeMember?.userId ?? ''),
    enabled: revokeMember !== null && isDesktop,
  })
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
    if (dialog?.kind === 'revoke') {
      void run(
        () =>
          removeMember(getBrowserSupabase(), {
            ledgerId,
            userId: dialog.member.userId,
          }),
        () => {
          closeDialog()
          notify.success(translate('revokeSheet.done'))
        },
      )
    } else if (dialog?.kind === 'cancel') {
      void run(
        () => cancelLedgerInvite(getBrowserSupabase(), dialog.invite.id, new Date()),
        () => {
          closeDialog()
          notify.success(translate('cancelSheet.done'))
        },
      )
    }
  }

  const inviteButton = (
    <Button type="button" className="cursor-pointer" onClick={() => setInviteOpen(true)}>
      <UserPlus aria-hidden className="size-5" />
      {translate('invite')}
    </Button>
  )
  const isAlone = isOwner && members.length <= 1 && invites.length === 0

  return (
    <div className="flex flex-col gap-4 lg:gap-6">
      {isOwner ? null : (
        <Banner kind="info">
          {translate('notice', {
            space: ledgerName,
            role: translate(`roles.${role}`),
            owner: ownerName,
          })}
        </Banner>
      )}
      {isAlone ? (
        <Card title={translate('membersTitle')}>
          <div className="flex flex-col items-center gap-3 p-2 text-center">
            <span
              aria-hidden
              className="flex size-10 items-center justify-center rounded-full bg-cat-blue-soft text-cat-blue-text"
            >
              <Users className="size-5" />
            </span>
            <p className="self-stretch text-body font-semibold text-text-primary">{translate('empty.title')}</p>
            <p className="self-stretch text-label text-text-secondary">{translate('empty.text')}</p>
            {inviteButton}
          </div>
        </Card>
      ) : (
        <div className="flex flex-col gap-4 lg:flex-row lg:gap-6">
          <div className="flex min-w-0 flex-1 flex-col gap-4 lg:gap-6">
            <Card title={translate('membersTitle')}>
              <div className="flex flex-col gap-4">
                <div className="flex flex-wrap items-center gap-4 pb-2">
                  <p className="min-w-0 flex-1 basis-60 text-label text-text-secondary">
                    {translate(isOwner ? 'ownerIntro' : 'memberIntro', { space: ledgerName })}
                  </p>
                  {isOwner ? inviteButton : <LeaveSpaceButton currentUserId={currentUserId} ownerName={ownerName} />}
                </div>
                <ul className="flex flex-col gap-4">
                  {members.map((member, index) => {
                    const name = memberName(member)
                    const isMemberOwner = member.role === 'owner'

                    return (
                      <li
                        key={member.userId}
                        className="flex flex-wrap items-center gap-x-4 gap-y-3 border-b border-border py-4 last:border-b-0"
                      >
                        <Avatar name={name} index={index} />
                        <div className="flex min-w-0 flex-1 basis-40 flex-col">
                          <span className="truncate text-body font-semibold text-text-primary">
                            {member.userId === currentUserId ? translate('you', { name }) : name}
                          </span>
                          <span className="text-caption text-text-tertiary">
                            {isMemberOwner
                              ? (member.email ?? '—')
                              : translate('since', {
                                  email: member.email ?? '—',
                                  date: day(member.joinedAt, true),
                                })}
                          </span>
                        </div>
                        <div className="basis-full sm:w-50 sm:basis-auto">
                          {isMemberOwner ? (
                            <span className="text-label font-medium text-text-secondary sm:px-4">
                              {translate('roles.owner')}
                            </span>
                          ) : (
                            <Select
                              aria-label={translate('roleLabel', { name })}
                              options={roleOptions}
                              value={member.role}
                              disabled={!isOwner || isPending}
                              onValueChange={(value) => changeRole(member, value)}
                            />
                          )}
                        </div>
                        {isOwner && !isMemberOwner ? (
                          <div className="flex sm:w-45 sm:justify-end">
                            <Button
                              type="button"
                              variant="ghost"
                              className="cursor-pointer"
                              onClick={() =>
                                setDialog({
                                  kind: 'revoke',
                                  member,
                                })
                              }
                            >
                              {translate('revoke')}
                            </Button>
                          </div>
                        ) : (
                          <span className="hidden sm:block sm:w-45" />
                        )}
                      </li>
                    )
                  })}
                </ul>
              </div>
            </Card>
            {isOwner && invites.length > 0 ? (
              <Card title={translate('pendingTitle')}>
                <ul className="flex flex-col gap-4">
                  {invites.map((invite, index) => (
                    <li key={invite.id} className="flex flex-wrap items-center gap-x-4 gap-y-3">
                      <Avatar name={invite.email} index={index + 2} />
                      <div className="flex min-w-0 flex-1 basis-40 flex-col">
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
      )}
      <InviteSheet open={inviteOpen} onOpenChange={setInviteOpen} />
      <ConfirmSheet
        open={dialog?.kind === 'revoke'}
        onOpenChange={(open) => !open && closeDialog()}
        title={translate('revokeSheet.title', { name: revokeName })}
        body={
          isDesktop
            ? translate('revokeSheet.body', {
                name: revokeName,
                space: ledgerName,
                counts: contributions.data ? translate('revokeSheet.counts', contributions.data) : '',
              })
            : translate('revokeSheet.bodyMobile', {
                name: revokeName,
                space: ledgerName,
              })
        }
        note={isDesktop ? translate('revokeSheet.again', { name: revokeName }) : undefined}
        keepLabel={translate('revokeSheet.keep')}
        confirmLabel={translate(isDesktop ? 'revokeSheet.confirm' : 'revokeSheet.confirmMobile')}
        onConfirm={confirm}
        pending={isPending}
        error={dialogError}
      />
      <ConfirmSheet
        open={dialog?.kind === 'cancel'}
        onOpenChange={(open) => !open && closeDialog()}
        title={translate('cancelSheet.title')}
        body={translate('cancelSheet.body', { email: dialog?.kind === 'cancel' ? dialog.invite.email : '' })}
        keepLabel={translate('cancelSheet.keep')}
        confirmLabel={translate('cancelSheet.confirm')}
        onConfirm={confirm}
        pending={isPending}
        error={dialogError}
      />
    </div>
  )
}
