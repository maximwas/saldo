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
  /** the first option, for no category */
  noneLabel: string
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
      options={[
        {
          value: NO_CATEGORY,
          label: noneLabel,
        },
        ...options,
      ]}
      value={value ?? NO_CATEGORY}
      onValueChange={(next) => onValueChange(next === NO_CATEGORY ? null : next)}
    />
  )
}
