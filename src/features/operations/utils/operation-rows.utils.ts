import type { OperationRow, OperationType, TransferInfo } from '../operations.types'

/** the columns listOperations selects from `operations` */
export type OperationDbRow = {
  id: string
  kind: string
  direction: string
  account_id: string
  amount_minor: number
  currency: string
  base_amount_minor: number | null
  base_currency: string
  category_id: string | null
  counterparty: string | null
  note: string | null
  occurred_at: string
  occurred_on: string
  transfer_id: string | null
  refund_of_id: string | null
  version: number
  created_by: string | null
}

/** DB row → list row; anything but 'in' counts as out */
export const toOperationRow = (row: OperationDbRow): OperationRow => ({
  id: row.id,
  kind: row.kind,
  direction: row.direction === 'in' ? 'in' : 'out',
  accountId: row.account_id,
  amountMinor: row.amount_minor,
  currency: row.currency,
  baseAmountMinor: row.base_amount_minor,
  baseCurrency: row.base_currency,
  categoryId: row.category_id,
  counterparty: row.counterparty,
  note: row.note,
  occurredAt: row.occurred_at,
  occurredOn: row.occurred_on,
  transferId: row.transfer_id,
  refundOfId: row.refund_of_id,
  version: row.version,
  createdBy: row.created_by,
})

/** the columns listOperations selects from `transfers` */
export type TransferDbRow = {
  id: string
  from_account_id: string
  to_account_id: string
  from_amount_minor: number
  from_currency: string
  to_amount_minor: number
  to_currency: string
  fee_minor: number | null
}

const toTransferInfo = (row: TransferDbRow): TransferInfo => ({
  id: row.id,
  fromAccountId: row.from_account_id,
  toAccountId: row.to_account_id,
  fromAmountMinor: row.from_amount_minor,
  fromCurrency: row.from_currency,
  toAmountMinor: row.to_amount_minor,
  toCurrency: row.to_currency,
  feeMinor: row.fee_minor,
})

/** transfers by id */
export function indexTransfers(rows: readonly TransferDbRow[]): Record<string, TransferInfo> {
  return Object.fromEntries(rows.map((row) => [row.id, toTransferInfo(row)]))
}

/** the distinct transfers the rows belong to */
export const transferIdsOf = (rows: readonly Pick<OperationRow, 'transferId'>[]) => [
  ...new Set(rows.flatMap((row) => (row.transferId ? [row.transferId] : []))),
]

const KINDS_BY_TYPE: Record<OperationType, string[] | null> = {
  all: null,
  expense: ['expense', 'refund'],
  income: ['income'],
  transfer: ['transfer_out', 'transfer_in'],
}

/** operations.kind values a type filter keeps; null = no filter */
export const kindsOfType = (type: OperationType) => KINDS_BY_TYPE[type]

/** `size`-long slices: PostgREST puts `in (...)` into the URL, so long id lists are split */
export function chunks<Item>(items: Item[], size: number) {
  return Array.from({ length: Math.ceil(items.length / size) }, (_, index) =>
    items.slice(index * size, (index + 1) * size),
  )
}
