import { z } from 'zod'
import { CURRENCIES } from '@/constants/currencies.constants'
import { INVITE_TOKEN_PATTERN } from '../utils/invite.utils'

export const createLedgerSchema = z.object({
  id: z.uuid(),
  name: z.string().trim().min(1).max(60),
  baseCurrency: z.enum(CURRENCIES),
})

export type CreateLedgerInput = z.infer<typeof createLedgerSchema>

// POST /api/invites/accept: 72 is bcrypt's limit, longer passwords would be cut silently
export const acceptInviteRequestSchema = z.object({
  token: z.string().regex(INVITE_TOKEN_PATTERN),
  password: z.string().min(8).max(72),
})
