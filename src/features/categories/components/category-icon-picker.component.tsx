import { Search } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useState } from 'react'
import { CategoryBadge } from '@/components/ui/category-badge.component'
import type { FieldControlProps } from '@/components/ui/field.component'
import { Input } from '@/components/ui/input.component'
import { CATEGORY_ICON_NAMES } from '@/constants/category-icons.constants'
import { cn } from '@/lib/utils/cn.utils'

type CategoryIconPickerProps = FieldControlProps & {
  value: string | null
  /** the chosen colour: every tile is drawn in it */
  color: string | null
  onChange: (icon: string) => void
}

// Figma «Saldo» → category form, icon picker: a search field, then solid CategoryBadge tiles (44) in the chosen colour (gap 16), the chosen
// one with a 2px text-primary ring; the grid scrolls inside the form
export function CategoryIconPicker({ value, color, onChange, id, ...aria }: CategoryIconPickerProps) {
  const translate = useTranslations('categories')
  const [query, setQuery] = useState('')
  const needle = query.trim().toLowerCase()
  // an icon added to CATEGORY_ICONS without a label yet reads by its lucide name
  const labelOf = (name: string) =>
    translate.has(`icons.${name}` as 'icons.tag') ? translate(`icons.${name}` as 'icons.tag') : name
  const names = CATEGORY_ICON_NAMES.filter(
    (name) => !needle || name.includes(needle) || labelOf(name).toLowerCase().includes(needle),
  )

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <Search
          className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-text-secondary"
          aria-hidden
        />
        <Input
          id={id}
          {...aria}
          type="search"
          autoComplete="off"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={translate('form.iconSearch')}
          className="pl-12"
        />
      </div>
      {names.length === 0 ? (
        <p className="text-label text-text-tertiary">{translate('form.iconEmpty')}</p>
      ) : (
        <fieldset
          aria-label={translate('form.icon')}
          className="flex max-h-60 min-w-0 flex-wrap gap-3 md:gap-4 overflow-y-auto p-1 scrollbar-none"
        >
          {names.map((name) => (
            <button
              key={name}
              type="button"
              aria-pressed={value === name}
              aria-label={labelOf(name)}
              title={labelOf(name)}
              onClick={() => onChange(name)}
              className={cn(
                'shrink-0 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-raised',
                value === name && 'ring-2 ring-text-primary ring-offset-2 ring-offset-raised',
              )}
            >
              <CategoryBadge icon={name} color={color} className="size-11" />
            </button>
          ))}
        </fieldset>
      )}
    </div>
  )
}
