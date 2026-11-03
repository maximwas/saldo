import { z } from 'zod'

/** every tool works in one space: the asked one if the caller is its member, else the space opened last */
export const ledgerIdField = z
  .uuid()
  .optional()
  .describe('Space id from list_ledgers. Default: the space the person opened last in Saldo.')

export const monthField = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/)
  .optional()
  .describe('Month as YYYY-MM. Default: the current month in the space time zone.')

export const spaceInput = z.object({ ledger_id: ledgerIdField })
