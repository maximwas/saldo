'use client'

import { Popover } from '@base-ui/react/popover'
import { Bell } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useState } from 'react'
import { Sheet, useIsDesktop } from '@/components/ui/sheet.component'
import { useUnreadCount } from '../hooks/notifications.hook'
import { NotificationsPanel, useBellTitle } from './notifications-panel.component'

// Figma «Saldo» → Topbar 2:8195: bell 44 (40 on mobile, 44 hit area); a primary dot says there is something new.
// The bell opens the popover 2:61239 (desktop) or the BottomSheet 36:109651 (phones) with the newest notifications.
export function NotificationBell() {
  const translate = useTranslations('shell')
  const unread = useUnreadCount() ?? 0
  const desktop = useIsDesktop()
  const sheetTitle = useBellTitle()
  const [open, setOpen] = useState(false)

  return (
    <>
      <Popover.Root open={open && desktop} onOpenChange={setOpen}>
        <Popover.Trigger
          aria-label={unread > 0 ? translate('notificationsUnread', { count: unread }) : translate('notifications')}
          className="relative flex size-10 cursor-pointer items-center justify-center rounded-md border border-border bg-card text-text-secondary outline-none after:absolute after:-inset-0.5 focus-visible:ring-2 focus-visible:ring-primary lg:size-11 lg:after:inset-0"
        >
          <Bell aria-hidden size={20} />
          {unread > 0 ? <span aria-hidden className="absolute top-2 right-2 size-2 rounded-full bg-primary" /> : null}
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Positioner side="bottom" align="end" sideOffset={8} collisionPadding={16} className="z-40">
            <Popover.Popup className="flex max-h-(--available-height) w-105 max-w-full flex-col gap-2 overflow-y-auto rounded-card border border-border bg-raised p-3 shadow-float outline-none transition-opacity duration-(--duration-base) ease-(--ease-standard) data-ending-style:opacity-0 data-starting-style:opacity-0">
              <NotificationsPanel withHeader onCloseAction={() => setOpen(false)} />
            </Popover.Popup>
          </Popover.Positioner>
        </Popover.Portal>
      </Popover.Root>
      {desktop ? null : (
        <Sheet open={open} onOpenChange={setOpen} title={sheetTitle}>
          <NotificationsPanel withHeader={false} onCloseAction={() => setOpen(false)} />
        </Sheet>
      )}
    </>
  )
}
