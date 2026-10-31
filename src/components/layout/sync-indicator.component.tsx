'use client'

import { useFormatter, useTranslations } from 'next-intl'
import { useState, useSyncExternalStore } from 'react'
import { useLedgerStore } from '@/contexts/ledger.context'
import { SyncQueueSheet } from '@/features/sync/components/sync-queue-sheet.component'
import { useSyncQueue } from '@/lib/query/sync-queue.hook'
import type { SyncSummary } from '@/lib/query/sync-queue.utils'
import { cn } from '@/lib/utils/cn.utils'
import { SyncStatus } from './sync-status.component'

type SyncIndicatorProps = {
  className?: string
}

type LabelParams = {
  summary: SyncSummary
  time: string | null
}

// the live SyncStatus (§22: the last update and how many changes wait); a click opens the queue
export function SyncIndicator({ className }: SyncIndicatorProps) {
  const translate = useTranslations('sync.status')
  const format = useFormatter()
  const timeZone = useLedgerStore((ledger) => ledger.timeZone)
  const { summary, updatedAt } = useSyncQueue()
  const [open, setOpen] = useState(false)
  // the restored cache gives the browser a time the server never had: show it only after hydration, so both match
  const hydrated = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  )
  const time =
    hydrated && updatedAt
      ? format.dateTime(new Date(updatedAt), {
          hour: '2-digit',
          minute: '2-digit',
          timeZone,
        })
      : null

  function label({ summary: { state, count }, time: syncedAt }: LabelParams) {
    if (state === 'synced') {
      return syncedAt ? translate('syncedAt', { time: syncedAt }) : translate('synced')
    }

    if (state === 'offline') {
      return count > 0 ? translate('offlineWaiting', { count }) : translate('offline')
    }

    return translate(state, { count })
  }

  const text = label({
    summary,
    time,
  })

  // the status inside is a live region, which gives the button no name from its content: the label names it
  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        aria-label={text}
        onClick={() => setOpen(true)}
        className="w-full cursor-pointer rounded-md text-left outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <SyncStatus state={summary.state} label={text} className={cn(className)} />
      </button>
      <SyncQueueSheet open={open} onOpenChangeAction={setOpen} />
    </>
  )
}
