'use client'

import { Bell } from 'lucide-react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { useUnreadCount } from '../hooks/notifications.hook'

// Figma «Saldo» → Topbar 2:8195: bell 44 (40 on mobile, 44 hit area); a primary dot says there is something new.
// The Figma popover 2:61239 is not built: the bell opens the notification page, which holds the same list.
export function NotificationBell() {
  const translate = useTranslations('shell')
  const unread = useUnreadCount() ?? 0

  return (
    <Link
      href="/notifications"
      aria-label={unread > 0 ? translate('notificationsUnread', { count: unread }) : translate('notifications')}
      className="relative flex size-10 items-center justify-center rounded-md border border-border bg-card text-text-secondary outline-none after:absolute after:-inset-0.5 focus-visible:ring-2 focus-visible:ring-primary lg:size-11 lg:after:inset-0"
    >
      <Bell aria-hidden size={20} />
      {unread > 0 ? <span aria-hidden className="absolute top-2 right-2 size-2 rounded-full bg-primary" /> : null}
    </Link>
  )
}
