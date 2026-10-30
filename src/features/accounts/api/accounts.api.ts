import { getLedgerFx } from '@/lib/finance/ledger-fx.api'
import { versionConflict } from '@/lib/supabase/version-conflict.utils'
import type { SaldoClient } from '@/types/supabase.types'
import {
  type CreateAccountInput,
  createAccountInputSchema,
  type UpdateAccountInput,
  updateAccountInputSchema,
} from '../schemas/account-input.schema'
import { type AccountView, toAccount } from '../utils/accounts.utils'

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
export async function countAccountOperations(
  supabase: SaldoClient,
  { ledgerId, accountId }: CountOperationsParams,
): Promise<number> {
  const { count, error } = await supabase
    .from('operations')
    .select('id', {
      count: 'exact',
      head: true,
    })
    .eq('ledger_id', ledgerId)
    .eq('account_id', accountId)

  if (error) {
    throw error
  }

  return count ?? 0
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
