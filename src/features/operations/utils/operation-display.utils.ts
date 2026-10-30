import type { SelectOption } from '@/components/ui/select.component'
import type {
  AccountOption,
  CategoryOption,
  OperationItem,
  OperationItemKind,
  OperationSource,
} from '../operations.types'

export type DisplayAmount = {
  /** signed: a spend is negative, so Amount prints the real minus */
  minor: number
  currency: string
  /** «+» is printed before an inflow; Amount itself only prints «−» */
  plus: boolean
  tone: 'fact' | 'income' | 'transfer'
}

// an adjustment is neutral like a transfer: it is neither income nor spending (§5)
const TONES: Partial<Record<OperationItemKind, DisplayAmount['tone']>> = {
  income: 'income',
  adjustment: 'transfer',
}

/**
 * The amount a row shows. A foreign-currency operation shows its base amount when the rate is known (Figma: «−124,38 ₴»,
 * the original goes to the subtitle); without a rate the original amount stays, never a 0.
 */
export function displayAmount({ row, kind }: OperationItem): DisplayAmount {
  const useBase = row.currency !== row.baseCurrency && row.baseAmountMinor !== null
  const minor = useBase ? (row.baseAmountMinor as number) : row.amountMinor
  const inflow = row.direction === 'in'

  return {
    minor: inflow ? minor : -minor,
    currency: useBase ? row.baseCurrency : row.currency,
    plus: inflow,
    tone: TONES[kind] ?? 'fact',
  }
}

/** the original amount goes to the subtitle when the row shows the base amount */
export const showsOriginal = ({ row }: OperationItem) =>
  row.currency !== row.baseCurrency && row.baseAmountMinor !== null

export function accountOptions(accounts: AccountOption[], keepId?: string): SelectOption[] {
  return accounts
    .filter((account) => !account.archived || account.id === keepId)
    .map((account) => ({
      value: account.id,
      label: `${account.name} · ${account.currency}`,
    }))
}

/** categories of one kind; a subcategory reads «Parent › Child»; an archived one stays only when the row already uses it */
export function categoryOptions(
  categories: CategoryOption[],
  kind: 'income' | 'expense',
  keepId?: string | null,
): SelectOption[] {
  const byId = new Map(categories.map((category) => [category.id, category]))

  return categories
    .filter((category) => category.kind === kind && (!category.archived || category.id === keepId))
    .map((category) => {
      const parent = category.parentId ? byId.get(category.parentId) : undefined

      return {
        value: category.id,
        label: parent ? `${parent.name} › ${category.name}` : category.name,
      }
    })
}

/** what is still refundable of a purchase; refunds of a purchase never exceed it (§5, checked by the database too) */
export const refundableMinor = (purchaseMinor: number, refundedMinor: number) =>
  Math.max(0, purchaseMinor - refundedMinor)

/** where «open source» leads: the credit or subscription card, the debts, else the payments list */
export function sourceHref({ sourceType, sourceId }: Pick<OperationSource, 'sourceType' | 'sourceId'>): string {
  if (sourceType === 'credit' && sourceId) {
    return `/payments/credits/${sourceId}`
  }

  if (sourceType === 'subscription' && sourceId) {
    return `/payments/subscriptions?sub=${sourceId}`
  }

  return sourceType === 'debt' ? '/payments/debts' : '/payments'
}
