import type { SelectOption } from '@/components/ui/select.component'
import type { AccountOption, CategoryOption, OperationItem } from '../operations.types'

export type DisplayAmount = {
  /** signed: a spend is negative, so Amount prints the real minus */
  minor: number
  currency: string
  /** «+» is printed before an inflow; Amount itself only prints «−» */
  plus: boolean
  tone: 'fact' | 'income'
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
    tone: kind === 'income' ? 'income' : 'fact',
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
