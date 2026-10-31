import { Plus } from 'lucide-react'
import { useTranslations } from 'next-intl'
import type { FieldControlProps } from '@/components/ui/field.component'
import { CATEGORY_COLORS, CATEGORY_SWATCHES, type CategoryColor } from '@/constants/category-colors.constants'
import { cn } from '@/lib/utils/cn.utils'

type CategoryColorPickerProps = FieldControlProps & {
  label: string
  value: string | null
  onChange: (color: CategoryColor) => void
}

// Figma «Saldo» → category form 2:50985 / 2:51601: 31 preset swatches in equal columns (8 on desktop, 6 on phones),
// gap 8, the first and last column on the edges of the name input (the -mx-1 / p-1 pair keeps room for the ring);
// the chosen one gets a 2px ring in text-primary with a 2px gap. The «own colour» swatch is shown disabled: its picker (29:96789) waits for custom colours in the database.
export function CategoryColorPicker({ label, value, onChange, ...aria }: CategoryColorPickerProps) {
  const translate = useTranslations('categories.colors')

  return (
    <fieldset aria-label={label} className="-mx-1 grid min-w-0 grid-cols-6 gap-2 p-1 lg:grid-cols-8" {...aria}>
      {CATEGORY_COLORS.map((color) => (
        <button
          key={color}
          type="button"
          aria-pressed={value === color}
          aria-label={translate(color)}
          title={translate(color)}
          onClick={() => onChange(color)}
          className={cn(
            'aspect-square w-full rounded-full outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-raised',
            CATEGORY_SWATCHES[color],
            value === color && 'ring-2 ring-text-primary ring-offset-2 ring-offset-raised',
          )}
        />
      ))}
      {/* Figma 29:96708 «own colour»: a spectrum ring with a plus; disabled until the database keeps custom colours */}
      <button
        type="button"
        disabled
        aria-label={translate('custom')}
        title={translate('custom')}
        className="flex aspect-square w-full cursor-not-allowed items-center justify-center rounded-full bg-spectrum"
      >
        <span className="flex size-3/4 items-center justify-center rounded-full bg-raised text-text-primary">
          <Plus className="size-5" aria-hidden />
        </span>
      </button>
    </fieldset>
  )
}
