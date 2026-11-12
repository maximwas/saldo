'use client'

import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Banner } from '@/components/ui/banner.component'
import { useLedgerStore } from '@/contexts/ledger.context'
import { SyncQueueCard } from '@/features/sync/components/sync-queue.component'
import { useSyncQueue } from '@/lib/query/sync-queue.hook'
import { localTime } from '@/lib/utils/clock.utils'
import { cn } from '@/lib/utils/cn.utils'
import { SyncIndicator } from './sync-indicator.component'

// Figma «Saldo» → phase 8, Offline 4:80063 / 4:80342: a warning Banner above the page while the device is offline, with the
// time of the data on screen on desktop; on mobile (no Sidebar) the Topbar SyncStatus pill sits above it, 8 apart.
// Pending sync / Mobile 4:80844: while writes are on their way the phone lists them in a card instead.
// Operations, Budget, Statistics and Notifications draw their own desktop warning (PageOfflineBanner: 5:105115,
// 41:107107, 41:110223, 2:62402), so there this one stays on phones only.
const OWN_WARNING_PATHS = new Set(['/operations', '/budget', '/statistics', '/notifications'])

export function OfflineBanner() {
  const ownWarning = OWN_WARNING_PATHS.has(usePathname())
  const translate = useTranslations('sync.banner')
  const timeZone = useLedgerStore((ledger) => ledger.timeZone)
  const { online, updatedAt, summary } = useSyncQueue()

  if (summary.state === 'pending') {
    return <SyncQueueCard className="mb-4 lg:hidden" />
  }

  if (summary.state === 'synced') {
    return null
  }

  return (
    <div className={cn('mb-4 flex flex-col gap-2 lg:mb-6', (online || ownWarning) && 'lg:hidden')}>
      <div className="lg:hidden">
        <SyncIndicator platform="topbar" />
      </div>
      {online ? null : (
        <Banner kind="warning" role="alert">
          <span className="lg:hidden">{translate('offlineShort')}</span>
          <span className="hidden lg:inline">
            {translate('offline')}{' '}
            {updatedAt ? translate('asOf', { time: localTime(new Date(updatedAt), timeZone) }) : null}
          </span>
        </Banner>
      )}
    </div>
  )
}
