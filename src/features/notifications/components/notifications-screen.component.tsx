'use client'

import { Bell, Check } from 'lucide-react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { useState, useSyncExternalStore } from 'react'
import { PageOfflineBanner } from '@/components/layout/page-offline-banner.component'
import { Button } from '@/components/ui/button.component'
import { EmptyState } from '@/components/ui/empty-state.component'
import { ErrorState } from '@/components/ui/error-state.component'
import { Sheet, SheetClose } from '@/components/ui/sheet.component'
import { Bone, SkeletonCard } from '@/components/ui/skeleton.component'
import { notify } from '@/components/ui/toaster.component'
import { useScreenQueryState } from '@/lib/query/screen-query-state.hook'
import type { AppNotification } from '../api/notifications.api'
import { useClearRead, useMarkRead, useNotifications } from '../hooks/notifications.hook'
import { usePush } from '../hooks/push.hook'
import { NotificationItem } from './notification-item.component'
import { PushBanner } from './push-banner.component'

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

const SKELETON_ROWS = [
  ['w-30', 'w-45'],
  ['w-25', 'w-40'],
  ['w-35', 'w-42.5'],
]

// Figma «Saldo» → Notifications · loading 36:110762: two white cards (padding 24, gap 20), three rows each: a 40 square
// in the subtle fill (radius md), a 16 and a 12 line (radius sm, gap 8)
function NotificationsSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy>
      {[0, 1].map((group) => (
        <SkeletonCard key={group} className="gap-5 p-6">
          {SKELETON_ROWS.map(([title, text]) => (
            <div key={title} className="flex items-center gap-4">
              <Bone className="size-10 rounded-md" />
              <div className="flex flex-col gap-2">
                <Bone className={`h-4 rounded-sm ${title}`} />
                <Bone className={`h-3 rounded-sm ${text}`} />
              </div>
            </div>
          ))}
        </SkeletonCard>
      ))}
    </div>
  )
}

// Figma «Saldo» → Notifications · empty 2:62210 (EmptyState 2:62389): a 40 blue circle with the bell, title
// body-semibold, text label, a secondary button to the settings, gap 12, padding 8
function EmptyNotifications() {
  const translate = useTranslations('notifications.emptyState')

  return (
    <EmptyState
      bare
      icon={Bell}
      tone="blue"
      title={translate('title')}
      hint={translate('text')}
      action={
        <Button variant="secondary" render={<Link href="/settings/notifications" />}>
          {translate('action')}
        </Button>
      }
    />
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
          <SheetClose>{translate('keep')}</SheetClose>
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

// Figma «Saldo» → Notifications 2:59946 (Desktop) / 2:61096 (Mobile): the push banner (36:111176, 36:111379), «mark all
// read» / «clear read», the list. Groups are «New» / «Read» (the design's Today / Earlier needs no date logic to say the
// same); the type filters of the frame wait for the other notification kinds (sync, access). States: loading 36:110762,
// empty 2:62210, offline 2:62402 (saved list under a warning), clear dialog 2:62586.
export function NotificationsScreen() {
  const translate = useTranslations('notifications')
  const translatePush = useTranslations('notifications.push')
  const push = usePush(translatePush('failed'))
  const notifications = useNotifications()
  const { failedLoad, retry } = useScreenQueryState([notifications], translate('refreshFailed'))
  const loaded = notifications.data
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
    <div className="flex flex-col gap-4 lg:gap-6">
      <PushBanner state={push.state} onEnableAction={() => void push.enable()} />
      <PageOfflineBanner text={() => translate('offline')} />
      {/* Figma 39:106643: nothing loaded, only the error card under the header */}
      {failedLoad ? (
        <ErrorState title={translate('loadFailed')} onRetryAction={retry} />
      ) : (
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
      )}
      {data === undefined && !failedLoad ? <NotificationsSkeleton /> : null}
      {data?.length === 0 ? <EmptyNotifications /> : null}
      <NotificationGroup title={translate('new')} items={unread} onReadAction={(id) => markRead.mutate([id])} />
      <NotificationGroup title={translate('read')} items={read} onReadAction={(id) => markRead.mutate([id])} />
      {clearing ? <ClearSheet count={read.length} onCloseAction={() => setClearing(false)} /> : null}
    </div>
  )
}
