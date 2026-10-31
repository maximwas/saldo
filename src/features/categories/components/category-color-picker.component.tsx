import { useTranslations } from 'next-intl'
import type { FieldControlProps } from '@/components/ui/field.component'
import { CATEGORY_COLORS, CATEGORY_SWATCHES, type CategoryColor } from '@/constants/category-colors.constants'
import { cn } from '@/lib/utils/cn.utils'

type CategoryColorPickerProps = FieldControlProps & {
  label: string
  value: string | null
  onChange: (color: CategoryColor) => void
}

// Figma «Saldo» → category form 2:50985: 31 preset swatches in rows of 8, gap 8; the chosen one gets a 2px ring in
// text-primary with a 2px gap. The «own colour» swatch and its picker (29:96789) wait for custom colours in the database.
export function CategoryColorPicker({ label, value, onChange, ...aria }: CategoryColorPickerProps) {
  const translate = useTranslations('categories.colors')

  return (
    <fieldset aria-label={label} className="grid min-w-0 grid-cols-8 gap-2 p-1" {...aria}>
      {CATEGORY_COLORS.map((color) => (
        <button
          key={color}
          type="button"
          aria-pressed={value === color}
          aria-label={translate(color)}
          title={translate(color)}
          onClick={() => onChange(color)}
          className={cn(
            'aspect-square w-full max-w-11 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-raised',
            CATEGORY_SWATCHES[color],
            value === color && 'ring-2 ring-text-primary ring-offset-2 ring-offset-raised',
          )}
        />
      ))}
    </fieldset>
  )
}
