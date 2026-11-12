import { Banner } from '@/components/ui/banner.component'
import { useLedgerStore } from '@/contexts/ledger.context'
import { useSyncQueue } from '@/lib/query/sync-queue.hook'
import { localTime } from '@/lib/utils/clock.utils'

type PageOfflineBannerProps = {
  /** the page's own sentence for the time of the data on screen */
  text: (time: string) => string
}

// Figma «Saldo» → a page's own desktop warning while offline (Operations 5:105115, Budget 41:107107, Statistics
// 41:110223, Notifications 2:62402): the same source and time zone as the shell's OfflineBanner, which stays on phones
// only on these pages (OWN_WARNING_PATHS).
export function PageOfflineBanner({ text }: PageOfflineBannerProps) {
  const timeZone = useLedgerStore((ledger) => ledger.timeZone)
  const { online, updatedAt } = useSyncQueue()

  if (online || updatedAt === null) {
    return null
  }

  return (
    <Banner kind="warning" role="alert" className="hidden lg:flex">
      {text(localTime(new Date(updatedAt), timeZone))}
    </Banner>
  )
}
