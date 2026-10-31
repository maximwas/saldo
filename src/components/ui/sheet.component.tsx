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

/** true from Tailwind's md up; the server snapshot is desktop */
export function useIsDesktop() {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(DESKTOP_QUERY).matches,
    () => true,
  )
}

type SheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  children: React.ReactNode
  /** action buttons: right-aligned on desktop, full-width and sticky on mobile */
  footer?: React.ReactNode
  /** the element focused on open; by default the first tabbable one, which is the close button */
  initialFocus?: React.RefObject<HTMLElement | null>
  /** desktop width: md 480 (Dialog 2:10240), lg 640 (the operation form, 2:16567) */
  size?: 'md' | 'lg'
  /** Figma Dialog / BottomSheet «More» (33:101623, 33:101738): a «···» menu left of ✕ */
  headerAction?: React.ReactNode
}

const DIALOG_WIDTH = {
  md: 'w-120',
  lg: 'w-160',
} as const

const CLOSE_CLASS =
  'flex shrink-0 cursor-pointer items-center justify-center rounded-md text-text-secondary outline-none transition-colors hover:bg-subtle focus-visible:ring-2 focus-visible:ring-primary'
const TITLE_CLASS = 'flex-1 text-card-title text-text-primary'
const BACKDROP_CLASS =
  'fixed inset-0 z-40 bg-scrim transition-opacity duration-(--duration-slow) ease-(--ease-standard) data-ending-style:opacity-0 data-starting-style:opacity-0'

// Figma «Saldo» → BottomSheet 2:10281 (mobile: radius card on top, handle 36x4, header with 44 close, scrolling body
// padding 8/20/20, sticky footer with top border and full-width buttons) and Dialog 2:10240 (desktop: 480 wide, 640 for the operation form,
// padding 24, gap 20, 36 close, footer: two equal buttons, flex 1 each, gap 12). The same props render either, so screens write one sheet.
export function Sheet({
  open,
  onOpenChange,
  title,
  children,
  footer,
  initialFocus,
  size = 'md',
  headerAction,
}: SheetProps) {
  const translate = useTranslations('common')
  // a sheet is opened by a click, so it never renders during hydration
  const desktop = useIsDesktop()

  if (desktop) {
    return (
      <Dialog.Root open={open} onOpenChange={onOpenChange}>
        <Dialog.Portal>
          <Dialog.Backdrop className={BACKDROP_CLASS} />
          {/* centred, as tall as its content up to spacing-4 from the edges: Figma 5:101464 draws a 850 dialog in 900 */}
          <Dialog.Viewport className="pointer-events-none fixed inset-0 z-40 flex items-center justify-center p-4">
            <Dialog.Popup
              initialFocus={initialFocus}
              className={cn(
                'pointer-events-auto flex max-h-full max-w-full flex-col gap-5 rounded-card bg-raised p-6 shadow-float outline-none transition-opacity duration-(--duration-slow) ease-(--ease-standard) data-ending-style:opacity-0 data-starting-style:opacity-0',
                DIALOG_WIDTH[size],
              )}
            >
              <div className="flex items-center gap-3">
                <Dialog.Title className={TITLE_CLASS}>{title}</Dialog.Title>
                {headerAction}
                <Dialog.Close aria-label={translate('close')} className={cn(CLOSE_CLASS, 'size-9')}>
                  <X className="size-5" aria-hidden />
                </Dialog.Close>
              </div>
              <div className="-m-1 flex min-h-0 flex-col gap-4 overflow-y-auto p-1 scrollbar-none">{children}</div>
              {footer ? <div className="flex items-center gap-3 *:flex-1">{footer}</div> : null}
            </Dialog.Popup>
          </Dialog.Viewport>
        </Dialog.Portal>
      </Dialog.Root>
    )
  }

  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange} swipeDirection="down">
      <Drawer.Portal>
        <Drawer.Backdrop className={BACKDROP_CLASS} />
        {/* Figma draws every sheet whole, up to 19 px below the top (33:101738): the sheet may grow to spacing-4 from it */}
        <Drawer.Viewport className="pointer-events-none fixed inset-x-0 top-4 bottom-0 z-40 flex flex-col justify-end">
          <Drawer.Popup
            initialFocus={initialFocus}
            className="pointer-events-auto flex max-h-full translate-y-(--drawer-swipe-movement-y) flex-col rounded-t-card bg-raised shadow-float outline-none transition-transform duration-(--duration-slow) ease-(--ease-emphasized) data-ending-style:translate-y-full data-starting-style:translate-y-full data-swiping:transition-none"
          >
            <div className="flex justify-center pt-2 pb-1" aria-hidden>
              <div className="h-1 w-9 rounded-full bg-border-strong" />
            </div>
            <div className="flex items-center gap-3 py-2 pr-4 pl-5">
              <Drawer.Title className={TITLE_CLASS}>{title}</Drawer.Title>
              {headerAction}
              <Drawer.Close aria-label={translate('close')} className={cn(CLOSE_CLASS, 'size-11')}>
                <X className="size-5" aria-hidden />
              </Drawer.Close>
            </div>
            <Drawer.Content className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-5 pt-2 pb-5 scrollbar-none">
              {children}
            </Drawer.Content>
            {footer ? (
              <div className="flex items-center gap-3 border-t border-border bg-raised px-5 pt-4 pb-8 *:flex-1">
                {footer}
              </div>
            ) : null}
          </Drawer.Popup>
        </Drawer.Viewport>
      </Drawer.Portal>
    </Drawer.Root>
  )
}
