import { z } from 'zod'
import { CURRENCIES } from '@/constants/currencies.constants'

export const INVITE_ROLES = ['editor', 'viewer'] as const

// tokenHash is the bytea hex PostgREST expects (hashInviteToken); the token itself never gets this far
export const createInviteInputSchema = z.object({
  id: z.uuid(),
  ledgerId: z.uuid(),
  email: z.email().max(254),
  role: z.enum(INVITE_ROLES),
  tokenHash: z.string().regex(/^\\x[0-9a-f]{64}$/),
})

export type CreateInviteInput = z.infer<typeof createInviteInputSchema>

export const setMemberRoleInputSchema = z.object({
  ledgerId: z.uuid(),
  userId: z.uuid(),
  role: z.enum(INVITE_ROLES),
})

export type SetMemberRoleInput = z.infer<typeof setMemberRoleInputSchema>

export const removeMemberInputSchema = z.object({
  ledgerId: z.uuid(),
  userId: z.uuid(),
})

export type RemoveMemberInput = z.infer<typeof removeMemberInputSchema>

// set_my_display_name: blank clears the name (the UI then shows the email prefix)
export const setMyDisplayNameInputSchema = z.object({
  ledgerId: z.uuid(),
  name: z.string().trim().max(60),
})

export type SetMyDisplayNameInput = z.infer<typeof setMyDisplayNameInputSchema>

// ledgers has no RPC: the owner's UPDATE (RLS) carries the version, a stale one matches no row
export const updateLedgerSettingsInputSchema = z.object({
  ledgerId: z.uuid(),
  version: z.number().int().positive(),
  name: z.string().trim().min(1).max(60),
  baseCurrency: z.enum(CURRENCIES),
  timeZone: z.string().min(1).max(64),
  weekStartsOn: z.number().int().min(0).max(6),
  nextIncomeOn: z.iso.date().nullable(),
})

export type UpdateLedgerSettingsInput = z.infer<typeof updateLedgerSettingsInputSchema>
