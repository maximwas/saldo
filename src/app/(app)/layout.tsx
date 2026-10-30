import { Suspense } from 'react'
import { Fab } from '@/components/layout/fab.component'
import { PageTransition } from '@/components/layout/page-transition.component'
import { Sidebar } from '@/components/layout/sidebar.component'
import { TabBar } from '@/components/layout/tab-bar.component'
import { Topbar } from '@/components/layout/topbar.component'
import { AddOperationHost } from '@/features/operations/components/add-operation-host.component'

// Overview desktop 2:8237: Sidebar 232 + Main (content padding 0 32 48); mobile 2:8735: content padding 4 20 32,
// TabBar fixed at the bottom, FAB over it. Desktop starts at lg (Figma has no tablet frame). Between pages only the
// content inside PageTransition animates; the shell stays still.
export default function AppLayout({ children }: LayoutProps<'/'>) {
  return (
    <div className="flex min-h-dvh">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col pb-(--tabbar-h) lg:pb-0">
        <Topbar />
        <main className="px-5 pt-1 pb-8 lg:px-8 lg:pt-0 lg:pb-12">
          <PageTransition className="flex max-w-(--content-max) flex-col gap-4 lg:gap-6">{children}</PageTransition>
        </main>
      </div>
      <TabBar />
      {/* ?add= is read from the URL: both wait in Suspense so the shell stays static (cacheComponents) */}
      <Suspense fallback={null}>
        <Fab />
        <AddOperationHost />
      </Suspense>
    </div>
  )
}
