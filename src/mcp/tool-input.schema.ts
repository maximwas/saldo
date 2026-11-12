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

export const confirmField = z.boolean().default(false).describe('false (default) only previews; true writes')

/** a client-generated id of a new record: the preview fills it in, so the confirm writes exactly once */
export const newIdField = z
  .uuid()
  .optional()
  .describe('Idempotency key. The preview returns one: send it back with confirm true; a repeat writes nothing.')

/** an edit's record version: the preview fills it in, a confirm with another one than the record has now writes nothing */
export const versionField = z
  .int()
  .nullable()
  .optional()
  .describe(
    'The record version the preview was made from: send back the one in confirmArguments. Required with confirm true; if the record changed since, nothing is written.',
  )

export const dayField = z.iso.date().optional().describe('YYYY-MM-DD, default today in the space time zone')
