import { describe, expect, it } from 'vitest'
import { acceptInviteRequestSchema } from '../schemas/ledger.schema'
import { type InviteFacts, inviteStatus, inviteStatusFromError, isInviteToken } from './invite.utils'

const NOW = new Date('2026-10-30T12:00:00Z')
const TOKEN = `${'a'.repeat(42)}_`
const invite: InviteFacts = {
  email: 'Olena@Example.test',
  expiresAt: '2026-11-06T12:00:00Z',
  acceptedAt: null,
  acceptedBy: null,
  revokedAt: null,
}
const olena = {
  userId: 'u-olena',
  email: 'olena@example.test',
}
const stranger = {
  userId: 'u-x',
  email: 'x@example.test',
}

describe('isInviteToken', () => {
  it('takes 43 base64url characters only', () => {
    expect(isInviteToken(TOKEN)).toBe(true)
    expect(isInviteToken(TOKEN.slice(1))).toBe(false)
    expect(isInviteToken(`${TOKEN.slice(1)}=`)).toBe(false)
    expect(isInviteToken(`${TOKEN.slice(1)}/`)).toBe(false)
  })
})

describe('inviteStatus', () => {
  it('is open for the invited email in any case and for a signed-out visitor', () => {
    expect(
      inviteStatus({
        invite,
        session: olena,
        now: NOW,
      }),
    ).toBe('open')
    expect(
      inviteStatus({
        invite,
        session: null,
        now: NOW,
      }),
    ).toBe('open')
  })

  it('is notFound without an invite', () => {
    expect(
      inviteStatus({
        invite: null,
        session: olena,
        now: NOW,
      }),
    ).toBe('notFound')
  })

  it('is expired at expires_at or when revoked', () => {
    const expired = {
      ...invite,
      expiresAt: NOW.toISOString(),
    }
    const revoked = {
      ...invite,
      revokedAt: '2026-10-29T00:00:00Z',
    }

    expect(
      inviteStatus({
        invite: expired,
        session: olena,
        now: NOW,
      }),
    ).toBe('expired')
    expect(
      inviteStatus({
        invite: revoked,
        session: null,
        now: NOW,
      }),
    ).toBe('expired')
  })

  it('is accepted for the person who accepted it and expired for anyone else', () => {
    const used = {
      ...invite,
      acceptedAt: '2026-10-30T11:00:00Z',
      acceptedBy: 'u-olena',
    }

    expect(
      inviteStatus({
        invite: used,
        session: olena,
        now: NOW,
      }),
    ).toBe('accepted')
    expect(
      inviteStatus({
        invite: used,
        session: stranger,
        now: NOW,
      }),
    ).toBe('expired')
  })

  it('is otherEmail for a signed-in person with another email', () => {
    expect(
      inviteStatus({
        invite,
        session: stranger,
        now: NOW,
      }),
    ).toBe('otherEmail')
  })
})

describe('inviteStatusFromError', () => {
  it('maps the accept_ledger_invite errors and leaves the rest to the banner', () => {
    expect(inviteStatusFromError('notFound')).toBe('notFound')
    expect(inviteStatusFromError('expired')).toBe('expired')
    expect(inviteStatusFromError('forbidden')).toBe('otherEmail')
    expect(inviteStatusFromError('unknown')).toBeNull()
  })
})

describe('acceptInviteRequestSchema', () => {
  it('needs a well-formed token and a password of 8 to 72 characters', () => {
    expect(
      acceptInviteRequestSchema.safeParse({
        token: TOKEN,
        password: 'correct horse',
      }).success,
    ).toBe(true)
    expect(
      acceptInviteRequestSchema.safeParse({
        token: TOKEN,
        password: 'short',
      }).success,
    ).toBe(false)
    expect(
      acceptInviteRequestSchema.safeParse({
        token: 'x',
        password: 'correct horse',
      }).success,
    ).toBe(false)
  })
})
