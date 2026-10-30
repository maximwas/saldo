'use client'

import { Check } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useState, useSyncExternalStore } from 'react'
import { Button } from '@/components/ui/button.component'
import { Sheet } from '@/components/ui/sheet.component'
import { notify } from '@/components/ui/toaster.component'
import type { AppNotification } from '../api/notifications.api'
import { useClearRead, useMarkRead, useNotifications } from '../hooks/notifications.hook'
import { NotificationItem } from './notification-item.component'
import { PushCard } from './push-card.component'

type GroupProps = {
  title: string
  items: AppNotification[]
  onReadAction: (id: string) => void
}

function NotificationGroup({ title, items, onReadAction }: GroupProps) {
  if (items.length === 0) {
    return null
  }

  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-label font-semibold text-text-secondary">{title}</h2>
      <ul className="flex flex-col gap-2">
        {items.map((item) => (
          <NotificationItem key={item.id} item={item} onReadAction={onReadAction} />
        ))}
      </ul>
    </section>
  )
}

type ClearSheetProps = {
  count: number
  onCloseAction: () => void
}

// Figma «Saldo» → Notifications · clear read 2:62586: «Clear N read notifications?», only the notifications go away
function ClearSheet({ count, onCloseAction }: ClearSheetProps) {
  const translate = useTranslations('notifications.clear')
  const clear = useClearRead()

  return (
    <Sheet
      open
      onOpenChange={(open) => !open && onCloseAction()}
      title={translate('title', { count })}
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onCloseAction}>
            {translate('keep')}
          </Button>
          <Button
            type="button"
            variant="danger"
            disabled={clear.isPending}
            onClick={() =>
              clear.mutate(undefined, {
                onSuccess: () => {
                  notify.success(translate('done'))
                  onCloseAction()
                },
              })
            }
          >
            {translate('confirm')}
          </Button>
        </>
      }
    >
      <p className="text-body text-text-secondary">{translate('text')}</p>
    </Sheet>
  )
}

// Figma «Saldo» → Notifications 2:59946 (Desktop) / 2:61096 (Mobile): subtitle with the count of new ones, «mark all
// read», the list. Groups are «New» / «Read» (the design's Today / Earlier needs no date logic to say the same);
// the type filters of the frame wait for the other notification kinds (sync, access). Empty 2:62210.
export function NotificationsScreen() {
  const translate = useTranslations('notifications')
  const { data: loaded, isPending, isError } = useNotifications()
  // the bell in the Topbar hydrates first and may have fetched the list already: the first client render must still
  // match the server's, so the list appears after hydration
  const hydrated = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  )
  const data = hydrated ? loaded : undefined
  const markRead = useMarkRead()
  const [clearing, setClearing] = useState(false)
  const unread = data?.filter((item) => !item.readAt) ?? []
  const read = data?.filter((item) => item.readAt) ?? []

  return (
    <div className="flex flex-col gap-4 lg:max-w-3xl lg:gap-6">
      <PushCard />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-label text-text-secondary">{translate('summary', { count: unread.length })}</p>
        <div className="flex flex-wrap gap-2">
          {unread.length > 0 ? (
            <Button type="button" variant="ghost" onClick={() => markRead.mutate(undefined)}>
              <Check aria-hidden className="size-5" />
              {translate('markAll')}
            </Button>
          ) : null}
          {read.length > 0 ? (
            <Button type="button" variant="ghost" onClick={() => setClearing(true)}>
              {translate('clear.action')}
            </Button>
          ) : null}
        </div>
      </div>
      {isError ? <p className="text-body text-negative-text">{translate('loadFailed')}</p> : null}
      {!isPending && !isError && data?.length === 0 ? (
        <p className="rounded-card bg-card p-6 text-center text-body text-text-secondary shadow-card">
          {translate('empty')}
        </p>
      ) : null}
      <NotificationGroup title={translate('new')} items={unread} onReadAction={(id) => markRead.mutate([id])} />
      <NotificationGroup title={translate('read')} items={read} onReadAction={(id) => markRead.mutate([id])} />
      {clearing ? <ClearSheet count={read.length} onCloseAction={() => setClearing(false)} /> : null}
    </div>
  )
}
