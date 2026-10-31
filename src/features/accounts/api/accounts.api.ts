import { type CreateOperationInput, createOperationInputSchema } from '@/lib/finance/create-operation-input.schema'
import { getLedgerFx } from '@/lib/finance/ledger-fx.api'
import { versionConflict } from '@/lib/supabase/version-conflict.utils'
import type { SaldoClient } from '@/types/supabase.types'
import {
  type CreateAccountInput,
  createAccountInputSchema,
  type UpdateAccountInput,
  updateAccountInputSchema,
} from '../schemas/account-input.schema'
import { type AccountView, type RecentTransfer, toAccount, toRecentTransfer } from '../utils/accounts.utils'

type AccountsParams = {
  ledgerId: string
  /** YYYY-MM-DD in the space time zone: the day whose rate converts the balances */
  today: string
}

export type AccountsData = {
  baseCurrency: string
  /** active and archived, in sort_order */
  accounts: AccountView[]
}

/** accounts with balances and their base-currency value (rule A rate of today); the same for the browser and MCP */
export async function getAccounts(supabase: SaldoClient, { ledgerId, today }: AccountsParams): Promise<AccountsData> {
  const [ledgerFx, accounts, balances] = await Promise.all([
    getLedgerFx(supabase, ledgerId),
    supabase
      .from('accounts')
      .select(
        'id, name, kind, currency, color, icon, opening_balance_minor, opening_balance_on, include_in_total, include_in_available, sort_order, archived_at, version',
      )
      .eq('ledger_id', ledgerId)
      .order('sort_order'),
    supabase.from('account_balances').select('account_id, balance_minor').eq('ledger_id', ledgerId),
  ])

  if (accounts.error) {
    throw accounts.error
  }

  if (balances.error) {
    throw balances.error
  }

  const context = {
    balanceOf: new Map(balances.data.map((row) => [row.account_id, row.balance_minor])),
    baseCurrency: ledgerFx.baseCurrency,
    rates: ledgerFx.rates,
    today,
  }

  return {
    baseCurrency: ledgerFx.baseCurrency,
    accounts: accounts.data.map((row) => toAccount(row, context)),
  }
}

type CountOperationsParams = {
  ledgerId: string
  accountId: string
}

/** how many operations an account has: the archive dialog says what stays in the history */
export type AccountActivity = {
  /** operations of the account, the legs of its transfers included */
  count: number
  /** the latest of them: the archive dialog names a single one */
  latest: {
    occurredAt: string
    title: string | null
  } | null
}

// the exact count comes with the latest row (a GET, not a HEAD request), so the dialog can name a single operation
export async function getAccountActivity(
  supabase: SaldoClient,
  { ledgerId, accountId }: CountOperationsParams,
): Promise<AccountActivity> {
  const { data, count, error } = await supabase
    .from('operations')
    .select('occurred_at, counterparty, note', { count: 'exact' })
    .eq('ledger_id', ledgerId)
    .eq('account_id', accountId)
    .order('occurred_at', { ascending: false })
    .limit(1)

  if (error) {
    throw error
  }

  const latest = data[0]

  return {
    count: count ?? data.length,
    latest: latest
      ? {
          occurredAt: latest.occurred_at,
          title: latest.counterparty ?? latest.note,
        }
      : null,
  }
}

export async function createAccount(supabase: SaldoClient, input: CreateAccountInput): Promise<void> {
  const row = createAccountInputSchema.parse(input)
  // a repeated id (a replayed offline write) hits the primary key and is not a second account
  const { error } = await supabase.from('accounts').upsert(row, {
    onConflict: 'id',
    ignoreDuplicates: true,
  })

  if (error) {
    throw error
  }
}

export async function updateAccount(supabase: SaldoClient, input: UpdateAccountInput): Promise<void> {
  const { id, expectedVersion, patch } = updateAccountInputSchema.parse(input)
  const { data, error } = await supabase
    .from('accounts')
    .update(patch)
    .eq('id', id)
    .eq('version', expectedVersion)
    .select('id')
    .maybeSingle()

  if (error) {
    throw error
  }

  if (!data) {
    throw versionConflict()
  }
}

/** a balance adjustment (§5) is an operation: create_operation writes it, idempotent on the client id */
export async function adjustBalance(supabase: SaldoClient, input: CreateOperationInput): Promise<void> {
  const { error } = await supabase.rpc('create_operation', { p_operation: createOperationInputSchema.parse(input) })

  if (error) {
    throw error
  }
}

/** the latest transfers for the Latest-transfers card of the accounts page */
export async function getRecentTransfers(
  supabase: SaldoClient,
  ledgerId: string,
  limit: number,
): Promise<RecentTransfer[]> {
  const { data, error } = await supabase
    .from('transfers')
    .select(
      'id, from_account_id, to_account_id, from_amount_minor, from_currency, to_amount_minor, to_currency, fee_minor, occurred_at, note',
    )
    .eq('ledger_id', ledgerId)
    .order('occurred_at', { ascending: false })
    .limit(limit)

  if (error) {
    throw error
  }

  return data.map(toRecentTransfer)
}
