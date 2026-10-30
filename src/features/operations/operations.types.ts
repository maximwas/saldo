import type { CURRENCIES } from '@/constants/currencies.constants'

export type Currency = (typeof CURRENCIES)[number]

export const OPERATION_TYPES = ['all', 'expense', 'income', 'transfer'] as const
export type OperationType = (typeof OPERATION_TYPES)[number]

/** the kinds the global «Add» can open (`?add=`) */
export const ADD_KINDS = ['expense', 'income', 'transfer'] as const
export type AddKind = (typeof ADD_KINDS)[number]

/** filters as the list query sees them: the period is already a pair of dates, null = no bound */
export type OperationFilters = {
  from: string | null
  to: string | null
  accountId: string | null
  categoryId: string | null
  type: OperationType
}

export type OperationRow = {
  id: string
  kind: string
  direction: 'in' | 'out'
  accountId: string
  amountMinor: number
  currency: string
  /** null = the rate is unknown, so the base amount is unknown (never 0) */
  baseAmountMinor: number | null
  baseCurrency: string
  categoryId: string | null
  counterparty: string | null
  note: string | null
  occurredAt: string
  occurredOn: string
  transferId: string | null
  version: number
  createdBy: string | null
}

export type TransferInfo = {
  id: string
  fromAccountId: string
  toAccountId: string
  fromAmountMinor: number
  fromCurrency: string
  toAmountMinor: number
  toCurrency: string
  feeMinor: number | null
}

export type OperationsData = {
  rows: OperationRow[]
  transfers: Record<string, TransferInfo>
  /** ids of operations that have at least one receipt (the paperclip) */
  receiptIds: string[]
  /** more rows matched than were loaded */
  truncated: boolean
}

export type AccountOption = {
  id: string
  name: string
  currency: Currency
  archived: boolean
}

export type CategoryOption = {
  id: string
  name: string
  kind: 'income' | 'expense'
  /** a token name from theme.css (blue … lime) or null */
  color: string | null
  parentId: string | null
  archived: boolean
}

export type Receipt = {
  id: string
  path: string
  mime: string
  /** signed URL, valid 5 minutes */
  url: string | null
}

export type OperationItemKind = 'expense' | 'income' | 'refund' | 'adjustment' | 'transfer' | 'debt'

/** one line of the list: a plain operation or a whole transfer (its two legs are one line) */
export type OperationItem = {
  row: OperationRow
  transfer: TransferInfo | null
  kind: OperationItemKind
}
