import { z } from 'zod'
import { CARRY_MODES } from '../utils/budget.utils'

const month = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/)

/** a limit of one expense category in one month; `expectedVersion` null = a new limit */
export const saveLimitInputSchema = z.object({
  ledgerId: z.uuid(),
  month,
  /** id for the month row when it does not exist yet; the row of a repeated write keeps its first id */
  monthId: z.uuid(),
  limitId: z.uuid(),
  categoryId: z.uuid(),
  limitMinor: z.int().positive(),
  carryMode: z.enum(CARRY_MODES),
  expectedVersion: z.int().positive().nullable(),
})

export type SaveLimitInput = z.infer<typeof saveLimitInputSchema>

/** `expectedVersion` null = the month has no row yet */
export const setIncomePlanInputSchema = z.object({
  ledgerId: z.uuid(),
  month,
  monthId: z.uuid(),
  incomePlanMinor: z.int().nonnegative().nullable(),
  expectedVersion: z.int().positive().nullable(),
})

export type SetIncomePlanInput = z.infer<typeof setIncomePlanInputSchema>

export const deleteLimitInputSchema = z.object({
  limitId: z.uuid(),
})

export type DeleteLimitInput = z.infer<typeof deleteLimitInputSchema>

export const copyMonthInputSchema = z.object({
  ledgerId: z.uuid(),
  from: month,
  to: month,
})

export type CopyMonthInput = z.infer<typeof copyMonthInputSchema>
