import type { LedgerAccountOption, LedgerCategoryOption } from '@/lib/finance/ledger-options.api'

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
  createdBy: string | null
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
  /** the purchase a refund returns (operations.refund_of_id) */
  refundOfId: string | null
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

export type AccountOption = LedgerAccountOption

export type CategoryOption = LedgerCategoryOption

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

/** refunds linked to purchases in the whole space, whatever page or period the list shows */
export type RefundLinks = {
  /** purchase id → the sum of its refunds, in the purchase currency */
  refundedById: Record<string, number>
  /** purchase id → the purchase (the date chip on a refund, and opening it) */
  purchases: Record<string, OperationRow>
}

/** an obligation an operation paid (obligation_payments → obligations), shown at the top of the operation */
export type OperationSource = {
  obligationId: string
  title: string
  dueOn: string
  sourceType: string
  sourceId: string | null
  /** null = the planned amount is unknown (§7) */
  plannedMinor: number | null
  currency: string
}

/** an open outgoing plan of today and the next 7 days: the «Planned» group above the facts (Figma 2:11543 / 2:13753) */
export type PlannedRow = {
  id: string
  title: string
  sourceType: string
  dueOn: string
  /** null = the planned amount is unknown (§7) */
  remainingMinor: number | null
  currency: string
  categoryId: string | null
  accountId: string | null
  /** a credit's «installment N of M» */
  installment: {
    number: number
    count: number
  } | null
  /** a subscription's period */
  interval: {
    unit: string
    count: number
  } | null
}
