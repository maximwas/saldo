import { Menu as MenuPrimitive } from '@base-ui/react/menu'
import { Ellipsis } from 'lucide-react'
import { cn } from '@/lib/utils/cn.utils'

export type MenuItem = {
  label: string
  onSelect: () => void
  danger?: boolean
  disabled?: boolean
}

type MenuProps = {
  /** aria-label of the «···» trigger */
  label: string
  items: readonly MenuItem[]
  className?: string
}

// Figma «Saldo» → Menu 2:10341: raised, border, radius inner, shadow-float, padding 6, rows 40 high with padding 0/12,
// radius sm, hover subtle; the «···» trigger is a 44 square (radius md) with a 20px ellipsis.
export function Menu({ label, items, className }: MenuProps) {
  return (
    <MenuPrimitive.Root>
      <MenuPrimitive.Trigger
        aria-label={label}
        className={cn(
          'flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-md text-text-primary outline-none transition-colors hover:bg-subtle focus-visible:ring-2 focus-visible:ring-primary data-popup-open:bg-subtle',
          className,
        )}
      >
        <Ellipsis className="size-5" aria-hidden />
      </MenuPrimitive.Trigger>
      <MenuPrimitive.Portal>
        <MenuPrimitive.Positioner align="end" sideOffset={4} className="z-50">
          <MenuPrimitive.Popup className="min-w-48 origin-(--transform-origin) rounded-inner border border-border bg-raised p-1.5 shadow-float outline-none transition-opacity data-ending-style:opacity-0 data-starting-style:opacity-0">
            {items.map((item) => (
              <MenuPrimitive.Item
                key={item.label}
                disabled={item.disabled}
                onClick={item.onSelect}
                className={cn(
                  'flex h-10 cursor-pointer items-center rounded-sm px-3 text-body outline-none data-disabled:cursor-not-allowed data-disabled:text-text-tertiary data-highlighted:bg-subtle',
                  item.danger ? 'text-negative-text' : 'text-text-primary',
                )}
              >
                {item.label}
              </MenuPrimitive.Item>
            ))}
          </MenuPrimitive.Popup>
        </MenuPrimitive.Positioner>
      </MenuPrimitive.Portal>
    </MenuPrimitive.Root>
  )
}
