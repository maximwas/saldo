'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button.component'
import { useMarkRead, useNotifications } from '../hooks/notifications.hook'
import { NotificationItem } from './notification-item.component'

const PANEL_LIMIT = 3

type NotificationsPanelProps = {
  onCloseAction: () => void
  /** the popover draws its own header (title + «All read»); the sheet has the title in its header and the button in the body */
  withHeader: boolean
}

/** «Notifications · 3 new» as the bell's popover and sheet show it */
export function useBellTitle() {
  const translate = useTranslations('notifications.popover')
  const { data } = useNotifications()

  return translate('title', { count: data?.filter((item) => !item.readAt).length ?? 0 })
}

// Figma «Saldo» → Notifications · popover 2:61239 (420 wide, padding 12, gap 8: header 44 with a ghost S «All read»,
// the three newest items, a ghost M «All notifications») and the same list in the BottomSheet body 36:109651
// (padding 8/20/20, gap 16, the ghost S button first).
export function NotificationsPanel({ onCloseAction, withHeader }: NotificationsPanelProps) {
  const translate = useTranslations('notifications.popover')
  const title = useBellTitle()
  const { data } = useNotifications()
  const markRead = useMarkRead()
  const unread = data?.some((item) => !item.readAt) ?? false
  const markAll = unread ? (
    <Button type="button" variant="ghost" size="s" onClick={() => markRead.mutate(undefined)}>
      {translate('markAll')}
    </Button>
  ) : null

  return (
    <>
      {withHeader ? (
        <div className="flex items-center py-1 pr-1 pl-3">
          <h2 className="flex-1 text-card-title text-text-primary">{title}</h2>
          {markAll}
        </div>
      ) : (
        markAll && <div className="flex">{markAll}</div>
      )}
      {data && data.length === 0 ? (
        <p className="px-3 py-6 text-center text-label text-text-secondary">{translate('empty')}</p>
      ) : (
        <ul className="flex flex-col gap-2 max-md:gap-4">
          {data?.slice(0, PANEL_LIMIT).map((item) => (
            <NotificationItem
              key={item.id}
              item={item}
              onReadAction={(id) => markRead.mutate([id])}
              onOpenAction={onCloseAction}
            />
          ))}
        </ul>
      )}
      <Link
        href="/notifications"
        onClick={onCloseAction}
        className="flex h-11 items-center justify-center rounded-md px-5 text-body font-medium text-primary-text outline-none hover:bg-primary-soft focus-visible:ring-2 focus-visible:ring-primary"
      >
        {translate('all')}
      </Link>
    </>
  )
}
