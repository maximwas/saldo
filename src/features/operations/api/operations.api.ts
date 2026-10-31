import { type AvailableObligation, monthEndOf, plannedToMonthEnd } from '@/lib/finance/available-money.utils'
import { type CreateOperationInput, createOperationInputSchema } from '@/lib/finance/create-operation-input.schema'
import { getLedgerRates } from '@/lib/finance/ledger-fx.api'
import { listAccountOptions, listCategoryOptions } from '@/lib/finance/ledger-options.api'
import type { FxRate } from '@/lib/money/fx.utils'
import { localDate } from '@/lib/utils/clock.utils'
import type { SaldoClient } from '@/types/supabase.types'
import type {
  AccountOption,
  CategoryOption,
  OperationFilters,
  OperationRow,
  OperationSource,
  OperationsData,
  Receipt,
  RefundLinks,
} from '../operations.types'
import { type CreateTransferInput, createTransferInputSchema } from '../schemas/create-transfer-input.schema'
import { type UpdateOperationInput, updateOperationInputSchema } from '../schemas/update-operation-input.schema'
import {
  chunks,
  indexTransfers,
  kindsOfType,
  type TransferDbRow,
  toOperationRow,
  transferIdsOf,
} from '../utils/operation-rows.utils'

/** shortcut: one page of the newest operations; a keyset «load more» comes with the statistics phase */
const OPERATIONS_LIMIT = 500
const RECEIPT_BUCKET = 'attachments'
const SIGNED_URL_SECONDS = 300
const IN_CHUNK = 50

const OPERATION_COLUMNS =
  'id, kind, direction, account_id, amount_minor, currency, base_amount_minor, base_currency, category_id, counterparty, note, occurred_at, occurred_on, transfer_id, refund_of_id, version, created_by'

type ListParams = {
  ledgerId: string
  filters: OperationFilters
}

const listQuery = (client: SaldoClient, ledgerId: string) =>
  client
    .from('operations')
    .select(OPERATION_COLUMNS)
    .eq('ledger_id', ledgerId)
    .order('occurred_on', { ascending: false })
    .order('occurred_at', { ascending: false })
    .order('id')
    .limit(OPERATIONS_LIMIT + 1)

type ListQuery = ReturnType<typeof listQuery>

function filterByPeriod(query: ListQuery, { from, to }: OperationFilters): ListQuery {
  return from && to ? query.gte('occurred_on', from).lte('occurred_on', to) : query
}

function filterByType(query: ListQuery, { type }: OperationFilters): ListQuery {
  const kinds = kindsOfType(type)

  return kinds ? query.in('kind', kinds) : query
}

function filterByOwners(query: ListQuery, { accountId, categoryId, createdBy }: OperationFilters): ListQuery {
  let filtered = query

  if (accountId) {
    filtered = filtered.eq('account_id', accountId)
  }

  if (categoryId) {
    filtered = filtered.eq('category_id', categoryId)
  }

  if (createdBy) {
    filtered = filtered.eq('created_by', createdBy)
  }

  return filtered
}

async function fetchOperations(client: SaldoClient, { ledgerId, filters }: ListParams) {
  const query = filterByType(filterByPeriod(filterByOwners(listQuery(client, ledgerId), filters), filters), filters)
  const { data, error } = await query

  if (error) {
    throw error
  }

  return data
}

/** the transfers behind the loaded rows, a chunk of ids per request */
async function fetchTransfers(client: SaldoClient, ledgerId: string, transferIds: string[]) {
  const results = await Promise.all(
    chunks(transferIds, IN_CHUNK).map((ids) =>
      client
        .from('transfers')
        .select(
          'id, from_account_id, to_account_id, from_amount_minor, from_currency, to_amount_minor, to_currency, fee_minor',
        )
        .eq('ledger_id', ledgerId)
        .in('id', ids),
    ),
  )
  const rows: TransferDbRow[] = []

  for (const result of results) {
    if (result.error) {
      throw result.error
    }

    rows.push(...result.data)
  }

  return rows
}

// shortcut: every receipt owner of the space, not only the loaded rows; ids in a URL would be too long for 500 rows
async function fetchReceiptOwnerIds(client: SaldoClient, ledgerId: string) {
  const { data, error } = await client
    .from('attachments')
    .select('owner_id')
    .eq('ledger_id', ledgerId)
    .eq('owner_type', 'operation')
    .limit(5000)

  if (error) {
    throw error
  }

  return data.map((receipt) => receipt.owner_id)
}

export async function listOperations(client: SaldoClient, params: ListParams): Promise<OperationsData> {
  const found = await fetchOperations(client, params)
  const rows = found.slice(0, OPERATIONS_LIMIT).map(toOperationRow)
  const [transferRows, receiptIds] = await Promise.all([
    fetchTransfers(client, params.ledgerId, transferIdsOf(rows)),
    fetchReceiptOwnerIds(client, params.ledgerId),
  ])

  return {
    rows,
    transfers: indexTransfers(transferRows),
    receiptIds,
    truncated: found.length > OPERATIONS_LIMIT,
  }
}

// shortcut: every linked refund of the space in one request, like the receipt owners; per page with «load more»
export async function listRefundLinks(client: SaldoClient, ledgerId: string): Promise<RefundLinks> {
  const refunds = await client
    .from('operations')
    .select('refund_of_id, amount_minor')
    .eq('ledger_id', ledgerId)
    .not('refund_of_id', 'is', null)
    .limit(5000)

  if (refunds.error) {
    throw refunds.error
  }

  const refundedById: Record<string, number> = {}

  for (const refund of refunds.data) {
    if (refund.refund_of_id) {
      refundedById[refund.refund_of_id] = (refundedById[refund.refund_of_id] ?? 0) + refund.amount_minor
    }
  }

  const results = await Promise.all(
    chunks(Object.keys(refundedById), IN_CHUNK).map((ids) =>
      client.from('operations').select(OPERATION_COLUMNS).eq('ledger_id', ledgerId).in('id', ids),
    ),
  )
  const purchases: Record<string, OperationRow> = {}

  for (const result of results) {
    if (result.error) {
      throw result.error
    }

    for (const row of result.data) {
      purchases[row.id] = toOperationRow(row)
    }
  }

  return {
    refundedById,
    purchases,
  }
}

/** the obligations an operation paid, the latest due date first (the link to the source, §4) */
export async function listOperationSources(client: SaldoClient, operationId: string): Promise<OperationSource[]> {
  const payments = await client.from('obligation_payments').select('obligation_id').eq('operation_id', operationId)

  if (payments.error) {
    throw payments.error
  }

  if (payments.data.length === 0) {
    return []
  }

  const obligations = await client
    .from('obligations')
    .select('id, title, due_on, source_type, source_id, planned_amount_minor, currency')
    .in(
      'id',
      payments.data.map((payment) => payment.obligation_id),
    )
    .order('due_on', { ascending: false })

  if (obligations.error) {
    throw obligations.error
  }

  return obligations.data.map((row) => ({
    obligationId: row.id,
    title: row.title,
    dueOn: row.due_on,
    sourceType: row.source_type,
    sourceId: row.source_id,
    plannedMinor: row.planned_amount_minor,
    currency: row.currency,
  }))
}

export type FormOptions = {
  accounts: AccountOption[]
  categories: CategoryOption[]
  rates: FxRate[]
  /** account id → balance in its own currency (account_balances) */
  balances: Record<string, number>
}

async function listBalances(client: SaldoClient, ledgerId: string): Promise<Record<string, number>> {
  const { data, error } = await client
    .from('account_balances')
    .select('account_id, balance_minor')
    .eq('ledger_id', ledgerId)

  if (error) {
    throw error
  }

  return Object.fromEntries(data.map((row) => [row.account_id, Number(row.balance_minor)]))
}

/** accounts, categories and FX rates the forms and the list need (shared loaders: features do not import each other) */
export async function getFormOptions(client: SaldoClient, ledgerId: string): Promise<FormOptions> {
  const [accounts, categories, rates, balances] = await Promise.all([
    listAccountOptions(client, ledgerId),
    listCategoryOptions(client, ledgerId),
    getLedgerRates(client, ledgerId),
    listBalances(client, ledgerId),
  ])

  return {
    accounts,
    categories,
    rates,
    balances,
  }
}

export async function createOperation(client: SaldoClient, raw: CreateOperationInput) {
  const { data, error } = await client.rpc('create_operation', { p_operation: createOperationInputSchema.parse(raw) })

  if (error) {
    throw error
  }

  return data
}

export async function updateOperation(client: SaldoClient, raw: UpdateOperationInput) {
  const input = updateOperationInputSchema.parse(raw)
  const { data, error } = await client.rpc('update_operation', {
    p_id: input.id,
    p_expected_version: input.expectedVersion,
    p_patch: input.patch,
  })

  if (error) {
    throw error
  }

  return data
}

type DeleteOperationParams = {
  id: string
  expectedVersion: number
}

/** the RPC deletes the receipt rows with the operation, so their paths are read first; the files go after the RPC (a
 * stale version must not cost the receipts) */
export async function deleteOperation(client: SaldoClient, { id, expectedVersion }: DeleteOperationParams) {
  const receipts = await client
    .from('attachments')
    .select('storage_path')
    .eq('owner_type', 'operation')
    .eq('owner_id', id)
  const { error } = await client.rpc('delete_operation', {
    p_id: id,
    p_expected_version: expectedVersion,
  })

  if (error) {
    throw error
  }

  // best effort: a file left here (or a transfer leg's receipt) is removed by the daily cron
  if (!receipts.error && receipts.data.length > 0) {
    await client.storage.from(RECEIPT_BUCKET).remove(receipts.data.map((receipt) => receipt.storage_path))
  }
}

export async function createTransfer(client: SaldoClient, raw: CreateTransferInput) {
  const { data, error } = await client.rpc('create_transfer', { p_transfer: createTransferInputSchema.parse(raw) })

  if (error) {
    throw error
  }

  return data
}

const EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'application/pdf': 'pdf',
}

type UploadReceiptParams = {
  ledgerId: string
  operationId: string
  file: Blob
}

/** Storage path `<ledger_id>/operation/<operation_id>/<uuid>.<ext>`: the first folder is what the bucket policies check */
export async function uploadReceipt(client: SaldoClient, { ledgerId, operationId, file }: UploadReceiptParams) {
  const path = `${ledgerId}/operation/${operationId}/${crypto.randomUUID()}.${EXTENSIONS[file.type] ?? 'bin'}`
  const uploaded = await client.storage.from(RECEIPT_BUCKET).upload(path, file, { contentType: file.type })

  if (uploaded.error) {
    throw uploaded.error
  }

  const inserted = await client.from('attachments').insert({
    ledger_id: ledgerId,
    owner_type: 'operation',
    owner_id: operationId,
    storage_path: path,
    mime: file.type,
    size_bytes: file.size,
  })

  if (inserted.error) {
    await client.storage.from(RECEIPT_BUCKET).remove([path])

    throw inserted.error
  }
}

type ReceiptRow = {
  id: string
  storage_path: string
  mime: string
}

type SignedUrl = {
  path: string | null
  signedUrl: string | null
}

const toReceipt = (row: ReceiptRow, signed: readonly SignedUrl[]): Receipt => ({
  id: row.id,
  path: row.storage_path,
  mime: row.mime,
  url: signed.find((entry) => entry.path === row.storage_path)?.signedUrl ?? null,
})

export async function listReceipts(client: SaldoClient, operationId: string): Promise<Receipt[]> {
  const rows = await client
    .from('attachments')
    .select('id, storage_path, mime')
    .eq('owner_type', 'operation')
    .eq('owner_id', operationId)
    .order('created_at')

  if (rows.error) {
    throw rows.error
  }

  if (rows.data.length === 0) {
    return []
  }

  const signed = await client.storage.from(RECEIPT_BUCKET).createSignedUrls(
    rows.data.map((row) => row.storage_path),
    SIGNED_URL_SECONDS,
  )

  if (signed.error) {
    throw signed.error
  }

  return rows.data.map((row) => toReceipt(row, signed.data))
}

export async function deleteReceipt(client: SaldoClient, receipt: Pick<Receipt, 'id' | 'path'>) {
  const removed = await client.storage.from(RECEIPT_BUCKET).remove([receipt.path])

  if (removed.error) {
    throw removed.error
  }

  const { error } = await client.from('attachments').delete().eq('id', receipt.id)

  if (error) {
    throw error
  }
}

type PlanParams = {
  ledgerId: string
  baseCurrency: string
  now: Date
  timeZone: string
}

/** open outgoing plans to the end of today's month, past unconfirmed ones included: the summary's «with plan» line */
export async function getPlannedToMonthEnd(
  supabase: SaldoClient,
  { ledgerId, baseCurrency, now, timeZone }: PlanParams,
) {
  const [due, rates] = await Promise.all([
    supabase
      .from('obligation_states')
      .select('obligation_id, direction, due_on, remaining_minor, currency, state')
      .eq('ledger_id', ledgerId)
      .in('state', ['plan', 'partial', 'unconfirmed'])
      .lte('due_on', monthEndOf(localDate(now, timeZone))),
    getLedgerRates(supabase, ledgerId),
  ])

  if (due.error) {
    throw due.error
  }

  return plannedToMonthEnd({
    baseCurrency,
    rates,
    now,
    timeZone,
    obligations: (due.data ?? []).map((row) => ({
      id: row.obligation_id,
      direction: row.direction as AvailableObligation['direction'],
      dueOn: row.due_on,
      remainingMinor: row.remaining_minor,
      currency: row.currency,
      state: row.state as AvailableObligation['state'],
    })),
  })
}
