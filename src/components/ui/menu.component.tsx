import { Drawer } from '@base-ui/react/drawer'
import { Menu as MenuPrimitive } from '@base-ui/react/menu'
import { Ellipsis, type LucideIcon, X } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Fragment } from 'react'
import { cn } from '@/lib/utils/cn.utils'

export type MenuItem = {
  label: string
  onSelect: () => void
  Icon?: LucideIcon
  /** red, after a divider in the dropdown */
  danger?: boolean
  disabled?: boolean
}

type MenuProps = {
  /** aria-label of the «···» trigger */
  label: string
  items: readonly MenuItem[]
  className?: string
  /** px along the trigger edge; with the popup aligned to the trigger's end a negative value moves it right */
  alignOffset?: number
}

const ITEM_CLASS =
  'flex cursor-pointer items-center gap-3 rounded-sm px-3 text-body outline-none data-disabled:cursor-not-allowed data-disabled:text-text-tertiary data-highlighted:bg-subtle'

type ItemContentProps = {
  item: MenuItem
  iconClassName?: string
}

function ItemContent({ item, iconClassName }: ItemContentProps) {
  return (
    <>
      {item.Icon ? <item.Icon className={cn('size-5 shrink-0', iconClassName)} aria-hidden /> : null}
      <span className="flex-1">{item.label}</span>
    </>
  )
}

// Figma «Saldo» → Menu 2:10341 / 15:85158: 240 wide, raised, border, radius inner, shadow-float, padding 6, gap 2; rows
// 40 high (padding 0/12, gap 12, a 20 icon, radius sm, hover subtle); a divider (padding 4/0) before the red items.
// The «···» trigger is a 44 square (radius md) with a 20px ellipsis. MenuItem 2:10325 paints the icon text-secondary,
// the danger one text-primary (33:101623).
export function Menu({ label, items, className, alignOffset }: MenuProps) {
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
        <MenuPrimitive.Positioner align="end" alignOffset={alignOffset} sideOffset={4} className="z-50">
          <MenuPrimitive.Popup className="flex w-60 origin-(--transform-origin) flex-col gap-0.5 rounded-inner border border-border bg-raised p-1.5 shadow-float outline-none transition-opacity data-ending-style:opacity-0 data-starting-style:opacity-0">
            {items.map((item, index) => (
              <Fragment key={item.label}>
                {item.danger && index > 0 && !items[index - 1]?.danger ? (
                  <MenuPrimitive.Separator className="py-1">
                    <div className="h-px bg-border" />
                  </MenuPrimitive.Separator>
                ) : null}
                <MenuPrimitive.Item
                  disabled={item.disabled}
                  onClick={item.onSelect}
                  className={cn(ITEM_CLASS, 'h-10', item.danger ? 'text-negative-text' : 'text-text-primary')}
                >
                  <ItemContent item={item} iconClassName={item.danger ? 'text-text-primary' : 'text-text-secondary'} />
                </MenuPrimitive.Item>
              </Fragment>
            ))}
          </MenuPrimitive.Popup>
        </MenuPrimitive.Positioner>
      </MenuPrimitive.Portal>
    </MenuPrimitive.Root>
  )
}

type ActionSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** e.g. the account name */
  title: string
  items: readonly MenuItem[]
}

// Figma «Saldo» → 15:85404 (mobile actions of a row): BottomSheet 2:10281 with the row's name as the title, ✕ 44, the
// menu rows 48 high (padding 0/12, gap 12, icon 20) in a body with padding 4/12/32 and gap 2, no divider
export function ActionSheet({ open, onOpenChange, title, items }: ActionSheetProps) {
  const translate = useTranslations('common')
  const choose = (item: MenuItem) => {
    onOpenChange(false)
    item.onSelect()
  }

  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange} swipeDirection="down">
      <Drawer.Portal>
        <Drawer.Backdrop className="fixed inset-0 z-40 bg-scrim transition-opacity duration-(--duration-slow) ease-(--ease-standard) data-ending-style:opacity-0 data-starting-style:opacity-0" />
        <Drawer.Popup className="fixed inset-x-0 bottom-0 z-40 flex max-h-11/12 translate-y-(--drawer-swipe-movement-y) flex-col rounded-t-card bg-raised shadow-float outline-none transition-transform duration-(--duration-slow) ease-(--ease-emphasized) data-ending-style:translate-y-full data-starting-style:translate-y-full data-swiping:transition-none">
          <div className="flex justify-center pt-2 pb-1" aria-hidden>
            <div className="h-1 w-9 rounded-full bg-border-strong" />
          </div>
          <div className="flex items-center gap-3 py-2 pr-4 pl-5">
            <Drawer.Title className="flex-1 truncate text-card-title text-text-primary">{title}</Drawer.Title>
            <Drawer.Close
              aria-label={translate('close')}
              className="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-md text-text-secondary outline-none transition-colors hover:bg-subtle focus-visible:ring-2 focus-visible:ring-primary"
            >
              <X className="size-5" aria-hidden />
            </Drawer.Close>
          </div>
          <Drawer.Content className="flex flex-col gap-0.5 px-3 pt-1 pb-8">
            {items.map((item) => (
              <button
                key={item.label}
                type="button"
                disabled={item.disabled}
                onClick={() => choose(item)}
                className={cn(
                  ITEM_CLASS,
                  'h-12 w-full text-left hover:bg-subtle focus-visible:bg-subtle disabled:cursor-not-allowed disabled:text-text-tertiary',
                  item.danger ? 'text-negative-text' : 'text-text-primary',
                )}
              >
                <ItemContent item={item} />
              </button>
            ))}
          </Drawer.Content>
        </Drawer.Popup>
      </Drawer.Portal>
    </Drawer.Root>
  )
}
