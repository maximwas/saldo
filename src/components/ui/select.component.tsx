import { Select as SelectPrimitive } from '@base-ui/react/select'
import { Check, ChevronDown } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils/cn.utils'
import type { FieldControlProps } from './field.component'

export type SelectOption = {
  value: string
  label: string
  disabled?: boolean
  /** before the label in the option and in the field: a CategoryBadge or a ServiceLogo, 32 */
  leading?: React.ReactNode
}

type SelectProps = FieldControlProps & {
  options: readonly SelectOption[]
  value: string | null
  onValueChange: (value: string | null) => void
  placeholder?: string
  disabled?: boolean
  name?: string
  onBlur?: () => void
  className?: string
  /** names the control where there is no visible label, e.g. a role picker inside a list row */
  'aria-label'?: string
  /** a filter chip instead of a field (Figma Chip 2:7714): «on» is the selected look with a check; no chevron */
  chip?: 'on' | 'off'
}

const FIELD_CLASS =
  'flex h-12 w-full items-center gap-2 rounded-md border border-border-strong bg-card px-4 text-left text-body text-text-primary outline-none transition-colors focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary data-popup-open:border-primary data-popup-open:ring-1 data-popup-open:ring-primary aria-invalid:border-negative aria-invalid:focus-visible:ring-negative disabled:cursor-not-allowed disabled:bg-subtle disabled:text-text-tertiary'

// every state keeps the 1px border so nothing jumps; only the colours change (Chip description in Figma)
const CHIP_CLASS = {
  on: 'border-primary bg-primary-soft text-primary-text',
  off: 'border-border-strong text-text-primary hover:bg-subtle active:bg-border',
} as const

// Figma «Saldo» → Select 2:9397: trigger 48 high, padding 0/16, gap 8, 20px chevron (up while open); Default 1px
// border-strong, Focus 2px primary, Error 1px negative, Disabled subtle fill; the selected option's leading sits before
// the value. List follows Menu 2:10341: raised, border, radius inner, shadow-float, padding 6, gap 2; SelectOption
// 29:89865 rows 40 high, padding 0/12, gap 12, radius sm, hover subtle, check on the selected one.
export function Select({
  options,
  value,
  onValueChange,
  placeholder,
  disabled,
  name,
  onBlur,
  className,
  id,
  'aria-describedby': describedBy,
  'aria-invalid': invalid,
  'aria-label': ariaLabel,
  chip,
}: SelectProps) {
  const translate = useTranslations('common')
  const leading = options.find((option) => option.value === value)?.leading

  return (
    <SelectPrimitive.Root items={options} value={value} onValueChange={onValueChange} disabled={disabled} name={name}>
      <SelectPrimitive.Trigger
        id={id}
        aria-label={ariaLabel}
        aria-describedby={describedBy}
        aria-invalid={invalid}
        onBlur={onBlur}
        className={cn(
          chip
            ? `flex shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-2 text-label font-medium outline-none transition-colors duration-(--duration-fast) ease-(--ease-standard) focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${CHIP_CLASS[chip]}`
            : FIELD_CLASS,
          className,
        )}
      >
        {chip === 'on' ? <Check className="size-4 shrink-0" aria-hidden /> : null}
        {chip ? null : leading}
        <SelectPrimitive.Value
          placeholder={placeholder ?? translate('select.placeholder')}
          className={cn('min-w-0 truncate data-placeholder:text-text-tertiary', !chip && 'flex-1')}
        />
        {chip ? null : (
          <SelectPrimitive.Icon className="shrink-0 text-text-secondary transition-transform data-popup-open:rotate-180">
            <ChevronDown className="size-5" aria-hidden />
          </SelectPrimitive.Icon>
        )}
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Positioner sideOffset={4} alignItemWithTrigger={false} className="z-50">
          <SelectPrimitive.Popup className="max-h-(--available-height) min-w-(--anchor-width) origin-(--transform-origin) overflow-y-auto rounded-inner scrollbar-none border border-border bg-raised p-1.5 shadow-float outline-none transition-opacity data-ending-style:opacity-0 data-starting-style:opacity-0">
            <SelectPrimitive.List className="flex flex-col gap-0.5 outline-none">
              {options.map((option) => (
                <SelectPrimitive.Item
                  key={option.value}
                  value={option.value}
                  label={option.label}
                  disabled={option.disabled}
                  className="flex h-10 cursor-pointer items-center gap-3 rounded-sm px-3 text-body text-text-primary outline-none data-disabled:cursor-not-allowed data-disabled:text-text-tertiary data-highlighted:bg-subtle"
                >
                  {option.leading}
                  <SelectPrimitive.ItemText className="min-w-0 flex-1 truncate">
                    {option.label}
                  </SelectPrimitive.ItemText>
                  <SelectPrimitive.ItemIndicator>
                    <Check className="size-5 text-primary-text" aria-hidden />
                  </SelectPrimitive.ItemIndicator>
                </SelectPrimitive.Item>
              ))}
            </SelectPrimitive.List>
          </SelectPrimitive.Popup>
        </SelectPrimitive.Positioner>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  )
}
