import { Dialog } from '@base-ui/react/dialog'
import { Drawer } from '@base-ui/react/drawer'
import { X } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useSyncExternalStore } from 'react'
import { cn } from '@/lib/utils/cn.utils'

// Tailwind's md breakpoint: below it the sheet is a bottom drawer, from it a centred dialog
const DESKTOP_QUERY = '(min-width: 48rem)'

const subscribe = (notify: () => void) => {
  const query = window.matchMedia(DESKTOP_QUERY)

  query.addEventListener('change', notify)

  return () => query.removeEventListener('change', notify)
}

type SheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  children: React.ReactNode
  /** action buttons: right-aligned on desktop, full-width and sticky on mobile */
  footer?: React.ReactNode
}

const CLOSE_CLASS =
  'flex shrink-0 cursor-pointer items-center justify-center rounded-md text-text-secondary outline-none transition-colors hover:bg-subtle focus-visible:ring-2 focus-visible:ring-primary'
const TITLE_CLASS = 'flex-1 text-card-title text-text-primary'
const BACKDROP_CLASS =
  'fixed inset-0 z-40 bg-text-primary/40 transition-opacity duration-(--duration-slow) ease-(--ease-standard) data-ending-style:opacity-0 data-starting-style:opacity-0'

// Figma «Saldo» → BottomSheet 2:10281 (mobile: radius card on top, handle 36x4, header with 44 close, scrolling body
// padding 8/20/20, sticky footer with top border and full-width buttons) and Dialog 2:10240 (desktop: 480 wide,
// padding 24, gap 20, 36 close, footer right-aligned). The same props render either, so screens write one sheet.
export function Sheet({ open, onOpenChange, title, children, footer }: SheetProps) {
  const translate = useTranslations('common')
  // server snapshot is desktop: a sheet is opened by a click, so it never renders during hydration
  const desktop = useSyncExternalStore(
    subscribe,
    () => window.matchMedia(DESKTOP_QUERY).matches,
    () => true,
  )

  if (desktop) {
    return (
      <Dialog.Root open={open} onOpenChange={onOpenChange}>
        <Dialog.Portal>
          <Dialog.Backdrop className={BACKDROP_CLASS} />
          <Dialog.Popup className="fixed top-1/2 left-1/2 z-40 flex max-h-11/12 w-120 max-w-full -translate-x-1/2 -translate-y-1/2 flex-col gap-5 rounded-card bg-raised p-6 shadow-float outline-none transition-opacity duration-(--duration-slow) ease-(--ease-standard) data-ending-style:opacity-0 data-starting-style:opacity-0">
            <div className="flex items-center gap-3">
              <Dialog.Title className={TITLE_CLASS}>{title}</Dialog.Title>
              <Dialog.Close aria-label={translate('close')} className={cn(CLOSE_CLASS, 'size-9')}>
                <X className="size-5" aria-hidden />
              </Dialog.Close>
            </div>
            <div className="-m-1 flex min-h-0 flex-col gap-4 overflow-y-auto p-1">{children}</div>
            {footer ? <div className="flex items-center justify-end gap-3">{footer}</div> : null}
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    )
  }

  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange} swipeDirection="down">
      <Drawer.Portal>
        <Drawer.Backdrop className={BACKDROP_CLASS} />
        <Drawer.Popup className="fixed inset-x-0 bottom-0 z-40 flex max-h-11/12 translate-y-(--drawer-swipe-movement-y) flex-col rounded-t-card bg-raised shadow-float outline-none transition-transform duration-(--duration-slow) ease-(--ease-emphasized) data-ending-style:translate-y-full data-starting-style:translate-y-full data-swiping:transition-none">
          <div className="flex justify-center pt-2 pb-1" aria-hidden>
            <div className="h-1 w-9 rounded-full bg-border-strong" />
          </div>
          <div className="flex items-center gap-3 py-2 pr-4 pl-5">
            <Drawer.Title className={TITLE_CLASS}>{title}</Drawer.Title>
            <Drawer.Close aria-label={translate('close')} className={cn(CLOSE_CLASS, 'size-11')}>
              <X className="size-5" aria-hidden />
            </Drawer.Close>
          </div>
          <Drawer.Content className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-5 pt-2 pb-5">
            {children}
          </Drawer.Content>
          {footer ? (
            <div className="flex items-center gap-3 border-t border-border bg-raised px-5 pt-4 pb-8 *:flex-1">
              {footer}
            </div>
          ) : null}
        </Drawer.Popup>
      </Drawer.Portal>
    </Drawer.Root>
  )
}
