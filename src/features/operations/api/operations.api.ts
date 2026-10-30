import type { FxRate } from '@/lib/money/fx.utils'
import type { SaldoClient } from '@/types/supabase.types'
import type {
  AccountOption,
  CategoryOption,
  Currency,
  OperationFilters,
  OperationRow,
  OperationsData,
  Receipt,
  TransferInfo,
} from '../operations.types'
import { type CreateOperationInput, createOperationInputSchema } from '../schemas/create-operation-input.schema'
import { type CreateTransferInput, createTransferInputSchema } from '../schemas/create-transfer-input.schema'
import { type UpdateOperationInput, updateOperationInputSchema } from '../schemas/update-operation-input.schema'

/** shortcut: one page of the newest operations; a keyset «load more» comes with the statistics phase */
export const OPERATIONS_LIMIT = 500
const RECEIPT_BUCKET = 'attachments'
const SIGNED_URL_SECONDS = 300
const IN_CHUNK = 50

const OPERATION_COLUMNS =
  'id, kind, direction, account_id, amount_minor, currency, base_amount_minor, base_currency, category_id, counterparty, note, occurred_at, occurred_on, transfer_id, version, created_by'

type ListParams = {
  ledgerId: string
  filters: OperationFilters
}

// a function declaration: dependency-cruiser reads a generic arrow in .ts as JSX and adds a react import
function chunks<Item>(items: Item[], size: number) {
  return Array.from({ length: Math.ceil(items.length / size) }, (_, index) =>
    items.slice(index * size, (index + 1) * size),
  )
}

export async function listOperations(client: SaldoClient, { ledgerId, filters }: ListParams): Promise<OperationsData> {
  let query = client
    .from('operations')
    .select(OPERATION_COLUMNS)
    .eq('ledger_id', ledgerId)
    .order('occurred_on', { ascending: false })
    .order('occurred_at', { ascending: false })
    .order('id')
    .limit(OPERATIONS_LIMIT + 1)

  if (filters.from && filters.to) {
    query = query.gte('occurred_on', filters.from).lte('occurred_on', filters.to)
  }

  if (filters.accountId) {
    query = query.eq('account_id', filters.accountId)
  }

  if (filters.categoryId) {
    query = query.eq('category_id', filters.categoryId)
  }

  if (filters.type === 'expense') {
    query = query.in('kind', ['expense', 'refund'])
  } else if (filters.type === 'income') {
    query = query.eq('kind', 'income')
  } else if (filters.type === 'transfer') {
    query = query.in('kind', ['transfer_out', 'transfer_in'])
  }

  const operations = await query

  if (operations.error) {
    throw operations.error
  }

  const truncated = operations.data.length > OPERATIONS_LIMIT
  const rows: OperationRow[] = operations.data.slice(0, OPERATIONS_LIMIT).map((row) => ({
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
    version: row.version,
    createdBy: row.created_by,
  }))
  const transferIds = [...new Set(rows.flatMap((row) => (row.transferId ? [row.transferId] : [])))]
  const [transferResults, receipts] = await Promise.all([
    Promise.all(
      chunks(transferIds, IN_CHUNK).map((ids) =>
        client
          .from('transfers')
          .select(
            'id, from_account_id, to_account_id, from_amount_minor, from_currency, to_amount_minor, to_currency, fee_minor',
          )
          .eq('ledger_id', ledgerId)
          .in('id', ids),
      ),
    ),
    // shortcut: every receipt owner of the space, not only the loaded rows; ids in a URL would be too long for 500 rows
    client.from('attachments').select('owner_id').eq('ledger_id', ledgerId).eq('owner_type', 'operation').limit(5000),
  ])
  const transfers: Record<string, TransferInfo> = {}

  for (const result of transferResults) {
    if (result.error) {
      throw result.error
    }

    for (const transfer of result.data) {
      transfers[transfer.id] = {
        id: transfer.id,
        fromAccountId: transfer.from_account_id,
        toAccountId: transfer.to_account_id,
        fromAmountMinor: transfer.from_amount_minor,
        fromCurrency: transfer.from_currency,
        toAmountMinor: transfer.to_amount_minor,
        toCurrency: transfer.to_currency,
        feeMinor: transfer.fee_minor,
      }
    }
  }

  if (receipts.error) {
    throw receipts.error
  }

  return {
    rows,
    transfers,
    receiptIds: receipts.data.map((receipt) => receipt.owner_id),
    truncated,
  }
}

export type FormOptions = {
  accounts: AccountOption[]
  categories: CategoryOption[]
  rates: FxRate[]
}

/** accounts, categories and FX rates the forms and the list need; kept here because features do not import each other */
export async function getFormOptions(client: SaldoClient, ledgerId: string): Promise<FormOptions> {
  const [accounts, categories, rates] = await Promise.all([
    client.from('accounts').select('id, name, currency, archived_at').eq('ledger_id', ledgerId).order('sort_order'),
    client
      .from('categories')
      .select('id, name, kind, color, parent_id, archived_at')
      .eq('ledger_id', ledgerId)
      .order('sort_order'),
    client
      .from('fx_rates')
      .select('base_currency, quote_currency, rate, rate_on, source')
      .eq('ledger_id', ledgerId)
      .order('rate_on', { ascending: false })
      .limit(500),
  ])

  if (accounts.error) {
    throw accounts.error
  }

  if (categories.error) {
    throw categories.error
  }

  if (rates.error) {
    throw rates.error
  }

  return {
    accounts: accounts.data.map((account) => ({
      id: account.id,
      name: account.name,
      currency: account.currency as Currency,
      archived: account.archived_at !== null,
    })),
    categories: categories.data.map((category) => ({
      id: category.id,
      name: category.name,
      kind: category.kind === 'income' ? 'income' : 'expense',
      color: category.color,
      parentId: category.parent_id,
      archived: category.archived_at !== null,
    })),
    rates: rates.data.map((rate) => ({
      baseCurrency: rate.base_currency,
      quoteCurrency: rate.quote_currency,
      rate: rate.rate,
      rateOn: rate.rate_on,
      source: rate.source === 'manual' ? 'manual' : 'reference',
    })),
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

/** the RPC first (a stale version must not cost the receipts), then the receipts: no FK ties them to the operation */
export async function deleteOperation(client: SaldoClient, { id, expectedVersion }: DeleteOperationParams) {
  const { error } = await client.rpc('delete_operation', {
    p_id: id,
    p_expected_version: expectedVersion,
  })

  if (error) {
    throw error
  }

  const receipts = await client
    .from('attachments')
    .select('id, storage_path')
    .eq('owner_type', 'operation')
    .eq('owner_id', id)

  // best effort: the operation is already gone, so a failure here leaves an orphan file, not a wrong balance
  if (!receipts.error && receipts.data.length > 0) {
    await client.storage.from(RECEIPT_BUCKET).remove(receipts.data.map((receipt) => receipt.storage_path))
    await client
      .from('attachments')
      .delete()
      .in(
        'id',
        receipts.data.map((receipt) => receipt.id),
      )
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

  return rows.data.map((row) => ({
    id: row.id,
    path: row.storage_path,
    mime: row.mime,
    url: signed.data.find((entry) => entry.path === row.storage_path)?.signedUrl ?? null,
  }))
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
