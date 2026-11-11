'use client'

import { useFormatter, useTranslations } from 'next-intl'
import { useState } from 'react'
import { useLedgerStore } from '@/contexts/ledger.context'
import { SyncQueuePopover, SyncQueueSheet } from '@/features/sync/components/sync-queue.component'
import { useSyncQueue } from '@/lib/query/sync-queue.hook'
import type { SyncSummary } from '@/lib/query/sync-queue.utils'
import { useHydrated } from '@/lib/utils/hydrated.hook'
import { SyncStatus } from './sync-status.component'

type SyncIndicatorProps = {
  /** sidebar: the desktop row that opens the queue popover; topbar: the mobile pill that opens the queue sheet */
  platform?: 'sidebar' | 'topbar'
}

// the live SyncStatus (§22: the last update and how many changes wait); a click opens the queue
export function SyncIndicator({ platform = 'sidebar' }: SyncIndicatorProps) {
  const translate = useTranslations('sync.status')
  const format = useFormatter()
  const timeZone = useLedgerStore((ledger) => ledger.timeZone)
  const { summary, updatedAt } = useSyncQueue()
  const [open, setOpen] = useState(false)
  // the restored cache gives the browser a time the server never had: show it only after hydration, so both match
  const hydrated = useHydrated()
  const sidebar = platform === 'sidebar'
  const time =
    hydrated && updatedAt
      ? format.dateTime(new Date(updatedAt), {
          hour: '2-digit',
          minute: '2-digit',
          timeZone,
        })
      : null

  // Figma 2:11328: the Sidebar row tells the time and the count, the Topbar pill only the state
  function label({ state, count }: SyncSummary) {
    if (state === 'synced') {
      return sidebar && time ? translate('syncedAt', { time }) : translate('synced')
    }

    if (state === 'pending') {
      return translate('pending', { count })
    }

    if (state === 'offline') {
      return sidebar && count > 0 ? translate('offlineWaiting', { count }) : translate('offline')
    }

    return sidebar && state === 'conflict' ? translate('conflictCount', { count }) : translate(state)
  }

  const text = label(summary)
  const actions = {
    error: translate('retry'),
    conflict: translate('resolve'),
  }
  const action = sidebar && (summary.state === 'error' || summary.state === 'conflict') ? actions[summary.state] : null
  // the status inside is a live region, which gives the button no name from its content: the label names it
  const name = action ? `${text}, ${action}` : text
  const status = <SyncStatus state={summary.state} label={text} action={action} platform={platform} />

  if (sidebar) {
    return <SyncQueuePopover label={name}>{status}</SyncQueuePopover>
  }

  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        aria-label={name}
        onClick={() => setOpen(true)}
        className="w-fit cursor-pointer rounded-full outline-none transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:ring-primary"
      >
        {status}
      </button>
      <SyncQueueSheet open={open} onOpenChangeAction={setOpen} />
    </>
  )
}
