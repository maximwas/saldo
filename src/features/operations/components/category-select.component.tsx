import { CategoryBadge } from '@/components/ui/category-badge.component'
import type { FieldControlProps } from '@/components/ui/field.component'
import { Select } from '@/components/ui/select.component'
import type { CategoryOption } from '../operations.types'
import { categoryOptions } from '../utils/operation-display.utils'

const NO_CATEGORY = '__none__'

type CategorySelectProps = FieldControlProps & {
  categories: CategoryOption[]
  kind: 'income' | 'expense'
  value: string | null
  onValueChange: (value: string | null) => void
  /** the first option, for no category; without it the field has no «none» and an empty one shows the placeholder (a
   * required category is chosen, never preselected) */
  noneLabel?: string
  placeholder?: string
  disabled?: boolean
  onBlur?: () => void
}

// Figma «Saldo» → Select 2:9397 with Show leading: every category (in the field and in the list 29:91017) has its
// CategoryBadge 32 before the name; «no category» has none
export function CategorySelect({ categories, kind, value, onValueChange, noneLabel, ...rest }: CategorySelectProps) {
  const byId = new Map(categories.map((category) => [category.id, category]))
  const options = categoryOptions(categories, kind, value).map((option) => {
    const category = byId.get(option.value)

    return {
      ...option,
      leading: <CategoryBadge icon={category?.icon ?? null} color={category?.color ?? null} size={32} />,
    }
  })

  return (
    <Select
      {...rest}
      options={
        noneLabel
          ? [
              {
                value: NO_CATEGORY,
                label: noneLabel,
              },
              ...options,
            ]
          : options
      }
      value={value ?? (noneLabel ? NO_CATEGORY : null)}
      onValueChange={(next) => onValueChange(next === NO_CATEGORY ? null : next)}
    />
  )
}
