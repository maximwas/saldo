import { Fab } from '@/components/layout/fab.component'
import { ServiceWorker } from '@/components/layout/service-worker.component'
import { Sidebar } from '@/components/layout/sidebar.component'
import type { Space } from '@/components/layout/space-switcher.component'
import { TabBar } from '@/components/layout/tab-bar.component'
import { Topbar } from '@/components/layout/topbar.component'

// shortcut: static space data until LedgerProvider (P0-B) is wired, replace in integration
const SPACES: readonly Space[] = [
  { id: 'demo-own', name: 'Мій Saldo', role: 'owner' },
  { id: 'demo-family', name: 'Сімейний', role: 'editor' },
]
const CURRENT_SPACE_ID = 'demo-own'

// Overview desktop 2:8237: Sidebar 232 + Main (content padding 0 32 48); mobile 2:8735: content padding 4 20 32,
// TabBar fixed at the bottom, FAB over it. Desktop starts at lg (Figma has no tablet frame).
export default function AppLayout({ children }: LayoutProps<'/'>) {
  const canWrite = SPACES.find((space) => space.id === CURRENT_SPACE_ID)?.role !== 'viewer'

  return (
    <ServiceWorker>
      <div className="flex min-h-dvh">
        <Sidebar spaces={SPACES} currentSpaceId={CURRENT_SPACE_ID} />
        <div className="flex min-w-0 flex-1 flex-col pb-(--tabbar-h) lg:pb-0">
          <Topbar spaces={SPACES} currentSpaceId={CURRENT_SPACE_ID} />
          <main className="px-5 pt-1 pb-8 lg:px-8 lg:pt-0 lg:pb-12">
            <div className="flex max-w-(--content-max) flex-col gap-4 lg:gap-6">{children}</div>
          </main>
        </div>
        <TabBar />
        {canWrite && <Fab />}
      </div>
    </ServiceWorker>
  )
}
