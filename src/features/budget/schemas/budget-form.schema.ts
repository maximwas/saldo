import { z } from 'zod'
import { CARRY_MODES } from '../utils/budget.utils'

/** messages are keys of the errors namespace; FormField translates them */
export const limitFormSchema = z.object({
  categoryId: z
    .uuid()
    .nullable()
    .refine((id) => id !== null, 'required'),
  /** MoneyInput minor units; empty is not a limit */
  limitMinor: z
    .number()
    .int()
    .positive('limitInvalid')
    .nullable()
    .refine((minor) => minor !== null, 'limitInvalid'),
  carryMode: z.enum(CARRY_MODES),
})

export type LimitFormInput = z.input<typeof limitFormSchema>
export type LimitFormValues = z.output<typeof limitFormSchema>

/** empty = no income plan */
export const incomeFormSchema = z.object({
  incomePlanMinor: z.number().int().positive('amountOptionalInvalid').nullable(),
})

export type IncomeFormInput = z.input<typeof incomeFormSchema>
export type IncomeFormValues = z.output<typeof incomeFormSchema>
