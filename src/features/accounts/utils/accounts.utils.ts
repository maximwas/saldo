import { accountBaseMinor, accountRate } from '@/lib/finance/base-balance.utils'
import type { FxRate } from '@/lib/money/fx.utils'

export const ACCOUNT_KINDS = ['bank', 'cash', 'savings'] as const

export type AccountKind = (typeof ACCOUNT_KINDS)[number]

/** icon and colour a new account gets from its kind (Figma «Saldo» → 2:21073: card blue, wallet teal, savings green) */
export const ACCOUNT_KIND_STYLE: Record<
  AccountKind,
  {
    icon: string
    color: string
  }
> = {
  bank: {
    icon: 'credit-card',
    color: 'blue',
  },
  cash: {
    icon: 'banknote',
    color: 'teal',
  },
  savings: {
    icon: 'piggy-bank',
    color: 'green',
  },
}

export type AccountView = {
  id: string
  name: string
  kind: AccountKind
  currency: string
  color: string | null
  icon: string | null
  openingBalanceMinor: number
  openingBalanceOn: string
  includeInTotal: boolean
  includeInAvailable: boolean
  sortOrder: number
  archivedAt: string | null
  version: number
  /** opening balance + operations, from the account_balances view */
  balanceMinor: number
  /** the balance in the base currency on today's rate (rule A); null when no rate links the currencies, never 0 */
  baseMinor: number | null
  /** the rate behind baseMinor as a decimal string, e.g. «41.5»; null for the base currency itself or no rate */
  rate: string | null
}

export type AccountsTotal = {
  totalMinor: number
  /** currencies of counted accounts that have no rate: the total misses them and says so */
  unknownCurrencies: string[]
}

/** «Total» of the accounts page: active accounts with include_in_total, in the base currency */
export function totalInBase(accounts: readonly AccountView[]): AccountsTotal {
  const unknown = new Set<string>()
  let totalMinor = 0

  for (const account of accounts) {
    if (account.archivedAt !== null || !account.includeInTotal) {
      continue
    }

    if (account.baseMinor === null) {
      unknown.add(account.currency)
    } else {
      totalMinor += account.baseMinor
    }
  }

  return {
    totalMinor,
    unknownCurrencies: [...unknown].sort(),
  }
}

/** next sort_order for a new account: after the last one */
export const nextSortOrder = (accounts: readonly Pick<AccountView, 'sortOrder'>[]) =>
  accounts.reduce((max, account) => Math.max(max, account.sortOrder), 0) + 1

/** the columns getAccounts selects from `accounts` */
export type AccountRow = {
  id: string
  name: string
  kind: string
  currency: string
  color: string | null
  icon: string | null
  opening_balance_minor: number
  opening_balance_on: string
  include_in_total: boolean
  include_in_available: boolean
  sort_order: number
  archived_at: string | null
  version: number
}

export type AccountContext = {
  /** account_balances by account id; an account without a row still holds its opening balance */
  balanceOf: ReadonlyMap<string, number | null>
  baseCurrency: string
  rates: FxRate[]
  /** YYYY-MM-DD in the space time zone */
  today: string
}

/** DB row → domain object: the balance, then the rate behind the base-currency value, then the value itself */
export function toAccount(row: AccountRow, { balanceOf, baseCurrency, rates, today }: AccountContext): AccountView {
  const balanceMinor = balanceOf.get(row.id) ?? row.opening_balance_minor
  const rate = accountRate({
    currency: row.currency,
    baseCurrency,
    rates,
    date: today,
  })

  return {
    id: row.id,
    name: row.name,
    kind: row.kind as AccountKind,
    currency: row.currency,
    color: row.color,
    icon: row.icon,
    openingBalanceMinor: row.opening_balance_minor,
    openingBalanceOn: row.opening_balance_on,
    includeInTotal: row.include_in_total,
    includeInAvailable: row.include_in_available,
    sortOrder: row.sort_order,
    archivedAt: row.archived_at,
    version: row.version,
    balanceMinor,
    baseMinor: accountBaseMinor({
      balanceMinor,
      currency: row.currency,
      baseCurrency,
      rate,
    }),
    rate: rate?.toFixed() ?? null,
  }
}
