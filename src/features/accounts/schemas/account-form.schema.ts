import { z } from 'zod'
import { CURRENCIES } from '@/constants/currencies.constants'
import { ACCOUNT_KIND_STYLE, ACCOUNT_KINDS } from '../utils/accounts.utils'
import type { CreateAccountInput, UpdateAccountInput } from './account-input.schema'

/** messages are keys of the errors namespace; FormField translates them */
export const accountFormSchema = z.object({
  name: z.string().trim().min(1, 'nameRequired').max(80, 'nameTooLong'),
  kind: z.enum(ACCOUNT_KINDS),
  currency: z.enum(CURRENCIES),
  /** MoneyInput gives integer minor units; null while empty */
  openingBalanceMinor: z
    .number()
    .int()
    .nullable()
    .refine((minor) => minor !== null, 'amountRequired'),
  openingOn: z.iso.date('dateInvalid'),
})

/** what the fields hold while typing (an empty opening balance is null) and what the schema accepts */
export type AccountFormInput = z.input<typeof accountFormSchema>
export type AccountFormValues = z.output<typeof accountFormSchema>

type CreateAccountContext = {
  id: string
  ledgerId: string
  sortOrder: number
}

/** ids are made before mutate, so a replay after reload carries the same idempotency key */
export function toCreateAccountInput(values: AccountFormValues, context: CreateAccountContext): CreateAccountInput {
  const style = ACCOUNT_KIND_STYLE[values.kind]

  return {
    id: context.id,
    ledger_id: context.ledgerId,
    name: values.name.trim(),
    kind: values.kind,
    currency: values.currency,
    opening_balance_minor: values.openingBalanceMinor,
    opening_balance_on: values.openingOn,
    color: style.color as CreateAccountInput['color'],
    icon: style.icon,
    include_in_total: true,
    include_in_available: true,
    sort_order: context.sortOrder,
  }
}

type UpdateTarget = {
  id: string
  expectedVersion: number
}

/** the currency and the opening balance are not edited: operations are in the account currency (§5) */
export const toUpdateAccountInput = (values: AccountFormValues, target: UpdateTarget): UpdateAccountInput => ({
  id: target.id,
  expectedVersion: target.expectedVersion,
  patch: {
    name: values.name.trim(),
    kind: values.kind,
  },
})
