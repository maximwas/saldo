'use client'

import { Popover } from '@base-ui/react/popover'
import { Check, ChevronDown, Search } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useRef, useState } from 'react'
import { CategoryBadge } from '@/components/ui/category-badge.component'
import type { FieldControlProps } from '@/components/ui/field.component'
import { FIELD_CLASS } from '@/components/ui/select.component'
import { ServiceLogo } from '@/components/ui/service-logo.component'
import { SERVICE_CHOICES } from '@/components/ui/service-logo.utils'
import { Sheet, useIsDesktop } from '@/components/ui/sheet.component'
import { cn } from '@/lib/utils/cn.utils'

/** the picker value of the custom subscription row; a catalog service is its own name */
export const CUSTOM_SERVICE = 'custom'

type ServiceSelectProps = FieldControlProps & {
  /** a catalog service name, CUSTOM_SERVICE, or null while nothing is chosen */
  value: string | null
  /** `typed` is what the search box held when the custom row (carrying the query) was picked */
  onValueChange: (value: string, typed: string) => void
  name?: string
  onBlur?: () => void
}

const OPTION_CLASS =
  'flex h-10 w-full cursor-pointer items-center gap-3 rounded-sm px-3 text-left text-body text-text-primary outline-none hover:bg-subtle focus-visible:bg-subtle'

const CustomBadge = () => <CategoryBadge icon="repeat" color="pink" size={32} />

type PanelProps = {
  value: string | null
  initialFocus: React.RefObject<HTMLInputElement | null>
  onPick: (value: string, typed: string) => void
}

// Figma «Saldo» → «Service options» 29:93592 (search 44 high + options 40 high, gap 2), the search state 29:94211 and
// the empty one 29:94759: the short list shows the six popular services, a query filters all of them, and
// the custom row is always the last one, carrying the query when there is one.
function ServicePanel({ value, initialFocus, onPick }: PanelProps) {
  const translate = useTranslations('subscriptions.form')
  const [query, setQuery] = useState('')
  const typed = query.trim()
  const needle = typed.toLowerCase()
  const services = SERVICE_CHOICES.filter((service) =>
    needle ? service.name.toLowerCase().includes(needle) : service.popular,
  )

  return (
    <div className="flex flex-col gap-0.5">
      <label className="flex h-11 items-center gap-2 rounded-md border border-border bg-card px-3 text-body focus-within:border-primary focus-within:ring-1 focus-within:ring-primary">
        <Search className="size-5 shrink-0 text-text-secondary" aria-hidden />
        <input
          ref={initialFocus}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={translate('serviceSearch')}
          autoComplete="off"
          aria-label={translate('serviceSearch')}
          className="min-w-0 flex-1 bg-transparent text-text-primary outline-none placeholder:text-text-tertiary"
        />
      </label>
      <div role="listbox" aria-label={translate('service')} className="flex flex-col gap-0.5">
        {services.map((service) => (
          <button
            key={service.name}
            type="button"
            role="option"
            aria-selected={service.name === value}
            className={OPTION_CLASS}
            onClick={() => onPick(service.name, typed)}
          >
            <ServiceLogo name={service.name} size={32} />
            <span className="min-w-0 flex-1 truncate">{service.name}</span>
            {service.name === value ? <Check className="size-5 shrink-0 text-primary-text" aria-hidden /> : null}
          </button>
        ))}
        {typed && services.length === 0 ? (
          <p className="flex h-10 items-center rounded-sm px-3 text-caption text-text-tertiary">
            {translate('serviceEmpty')}
          </p>
        ) : null}
        <button
          type="button"
          role="option"
          aria-selected={value === CUSTOM_SERVICE}
          className={cn(OPTION_CLASS, typed && services.length === 0 && 'bg-subtle')}
          onClick={() => onPick(CUSTOM_SERVICE, typed)}
        >
          <CustomBadge />
          <span className="min-w-0 flex-1 truncate">
            {typed ? translate('serviceCustomNamed', { name: typed }) : translate('serviceCustom')}
          </span>
          {value === CUSTOM_SERVICE ? <Check className="size-5 shrink-0 text-primary-text" aria-hidden /> : null}
        </button>
      </div>
    </div>
  )
}

// Figma «Saldo» → Select 2:9397 with a leading logo; the list is a popover under the field on desktop (29:93202) and a
// BottomSheet on a phone (36:106665). The service logo comes from public/logos; a name without one gets a letter tile.
export function ServiceSelect({
  value,
  onValueChange,
  name,
  onBlur,
  id,
  'aria-describedby': describedBy,
  'aria-invalid': invalid,
  'aria-required': required,
}: ServiceSelectProps) {
  const translate = useTranslations('subscriptions.form')
  const desktop = useIsDesktop()
  const [open, setOpen] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)
  const label = value === CUSTOM_SERVICE ? translate('serviceCustom') : value
  const pick = (next: string, typed: string) => {
    onValueChange(next, typed)
    setOpen(false)
  }
  const trigger = (
    <>
      {value === CUSTOM_SERVICE ? <CustomBadge /> : null}
      {value && value !== CUSTOM_SERVICE ? <ServiceLogo name={value} size={32} /> : null}
      <span className={cn('min-w-0 flex-1 truncate', !value && 'text-text-tertiary')}>
        {label ?? translate('servicePlaceholder')}
      </span>
      <ChevronDown
        className={cn('size-5 shrink-0 text-text-secondary transition-transform', open && 'rotate-180')}
        aria-hidden
      />
    </>
  )

  if (desktop) {
    return (
      <Popover.Root open={open} onOpenChange={setOpen}>
        <Popover.Trigger
          id={id}
          name={name}
          onBlur={onBlur}
          aria-describedby={describedBy}
          aria-invalid={invalid}
          aria-required={required}
          className={cn(FIELD_CLASS, open && 'border-primary ring-1 ring-primary')}
        >
          {trigger}
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Positioner sideOffset={4} align="start" className="z-50">
            <Popover.Popup
              initialFocus={searchRef}
              className="max-h-(--available-height) w-(--anchor-width) origin-(--transform-origin) overflow-y-auto rounded-inner border border-border bg-raised p-1.5 shadow-float outline-none scrollbar-none transition-opacity data-ending-style:opacity-0 data-starting-style:opacity-0"
            >
              <ServicePanel value={value} initialFocus={searchRef} onPick={pick} />
            </Popover.Popup>
          </Popover.Positioner>
        </Popover.Portal>
      </Popover.Root>
    )
  }

  return (
    <>
      <button
        type="button"
        id={id}
        name={name}
        onBlur={onBlur}
        aria-describedby={describedBy}
        aria-invalid={invalid}
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
        className={cn(FIELD_CLASS, 'cursor-pointer')}
      >
        {trigger}
      </button>
      <Sheet open={open} onOpenChange={setOpen} title={translate('service')} initialFocus={searchRef}>
        <ServicePanel value={value} initialFocus={searchRef} onPick={pick} />
      </Sheet>
    </>
  )
}
