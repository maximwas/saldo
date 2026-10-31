import { stringToUint8Array, uint8ArrayToBase64, uint8ArrayToHex } from 'uint8array-extras'
import type { PgError } from '@/lib/supabase/pg-error.utils'
import type { LedgerRole } from '@/types/supabase.types'

// 32 random bytes as base64url without padding = 43 characters; anything else never reaches the database
const INVITE_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/

export const isInviteToken = (token: string) => INVITE_TOKEN_PATTERN.test(token)

export type InviteStatus = 'open' | 'accepted' | 'expired' | 'otherEmail' | 'notFound'

/** what the invite page shows; who accepted it and the hash stay on the server */
export type InviteView = {
  ledgerId: string
  ledgerName: string
  role: LedgerRole
  email: string
  inviterName: string | null
  inviterEmail: string | null
  expiresAt: string
  acceptedAt: string | null
}

export type InviteFacts = {
  email: string
  expiresAt: string
  acceptedAt: string | null
  acceptedBy: string | null
  revokedAt: string | null
}

type InviteSession = {
  userId: string
  email: string | null
}

type InviteStatusInput = {
  invite: InviteFacts | null
  session: InviteSession | null
  now: Date
}

// signed out: maybe the same person on another device; after login the check runs again
const acceptedStatus = (invite: InviteFacts, session: InviteSession | null): InviteStatus =>
  !session || invite.acceptedBy === session.userId ? 'accepted' : 'expired'

const isClosed = (invite: InviteFacts, now: Date) => Boolean(invite.revokedAt) || new Date(invite.expiresAt) <= now

const isOtherEmail = (invite: InviteFacts, session: InviteSession | null) =>
  session !== null && session.email?.toLowerCase() !== invite.email.toLowerCase()

// Mirrors accept_ledger_invite's checks, so the page shows the right card before anyone presses a button
export function inviteStatus({ invite, session, now }: InviteStatusInput): InviteStatus {
  if (!invite) {
    return 'notFound'
  }

  if (invite.acceptedAt) {
    return acceptedStatus(invite, session)
  }

  if (isClosed(invite, now)) {
    return 'expired'
  }

  if (isOtherEmail(invite, session)) {
    return 'otherEmail'
  }

  return 'open'
}

const STATUS_BY_ERROR: Partial<Record<PgError['kind'], InviteStatus>> = {
  notFound: 'notFound', // P0002
  expired: 'expired', // PT410: expired, revoked or used by someone else
  forbidden: 'otherEmail', // 42501: signed in with another email
}

// null: not an answer about the invite (network, server), so the page keeps the card and shows the error banner
export const inviteStatusFromError = (kind: PgError['kind']) => STATUS_BY_ERROR[kind] ?? null

const BYTE_LENGTH = 32

/** 32 random bytes as base64url: the link's secret. Made in the browser, shown once, never stored or logged. */
export const createInviteToken = () =>
  uint8ArrayToBase64(crypto.getRandomValues(new Uint8Array(BYTE_LENGTH)), { urlSafe: true })

/** what accept_ledger_invite compares: SHA-256 of the token's UTF-8 bytes, as PostgREST's bytea hex */
export async function hashInviteToken(token: string) {
  const digest = await crypto.subtle.digest('SHA-256', stringToUint8Array(token))

  return `\\x${uint8ArrayToHex(new Uint8Array(digest))}`
}
