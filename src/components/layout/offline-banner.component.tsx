'use client'

import { TriangleAlert } from 'lucide-react'
import { useFormatter, useTranslations } from 'next-intl'
import { useLedgerStore } from '@/contexts/ledger.context'
import { useSyncQueue } from '@/lib/query/sync-queue.hook'
import { SyncIndicator } from './sync-indicator.component'

// Figma «Saldo» → App states, Offline 4:80063 / 4:80342: a warning above the page while the device is offline, with
// the time of the data on screen; on mobile (no Sidebar) the SyncStatus of the queue sits here whenever it is not empty
export function OfflineBanner() {
  const translate = useTranslations('sync.banner')
  const format = useFormatter()
  const timeZone = useLedgerStore((ledger) => ledger.timeZone)
  const { online, updatedAt, summary } = useSyncQueue()
  const asOf = updatedAt
    ? translate('asOf', {
        time: format.dateTime(new Date(updatedAt), {
          hour: '2-digit',
          minute: '2-digit',
          timeZone,
        }),
      })
    : ''

  return (
    <>
      {online ? null : (
        <p
          role="alert"
          className="mb-4 flex items-start gap-2 rounded-md bg-warning-soft px-4 py-3 text-label text-warning-text lg:mb-6"
        >
          <TriangleAlert aria-hidden size={16} className="mt-0.5 shrink-0" />
          <span className="lg:hidden">{translate('offlineShort')}</span>
          <span className="hidden lg:inline">
            {translate('offline')} {asOf}
          </span>
        </p>
      )}
      {summary.state === 'synced' ? null : (
        <div className="mb-4 w-fit lg:hidden">
          <SyncIndicator className="h-8 rounded-full" />
        </div>
      )}
    </>
  )
}
