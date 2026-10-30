import { z } from 'zod'
import type { SaveDebtInput } from './save-debt-input.schema'

/** an existing debt: who, why, the account, the due date and the note; amounts change through repayments */
export const debtEditFormSchema = z.object({
  person: z.string().trim().min(1, 'nameRequired').max(80),
  reason: z.string().trim().max(200),
  accountId: z.uuid().nullable(),
  dueOn: z.iso.date().nullable(),
  note: z.string().trim().max(500),
})

export type DebtEditFormValues = z.infer<typeof debtEditFormSchema>

type DebtVersion = {
  id: string
  version: number
}

export const toEditDebtInput = (values: DebtEditFormValues, debt: DebtVersion, ledgerId: string): SaveDebtInput => ({
  debt: {
    id: debt.id,
    ledger_id: ledgerId,
    version: debt.version,
    person: values.person,
    reason: values.reason.trim() || null,
    account_id: values.accountId,
    due_on: values.dueOn,
    note: values.note.trim() || null,
  },
  operation: null,
})

/** closing or writing off a debt: only the status changes */
export const toStatusInput = (
  debt: DebtVersion,
  status: 'settled' | 'written_off',
  ledgerId: string,
): SaveDebtInput => ({
  debt: {
    id: debt.id,
    ledger_id: ledgerId,
    version: debt.version,
    status,
  },
  operation: null,
})
