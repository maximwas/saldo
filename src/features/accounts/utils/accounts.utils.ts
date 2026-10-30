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
