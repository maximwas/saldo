'use client'

import type { Route } from 'next'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils/cn.utils'

type RouteTabsProps = {
  label: string
  tabs: readonly {
    href: string
    label: React.ReactNode
    /** the tab is active on this path only, not on the paths below it */
    exact?: boolean
  }[]
  /** gap between the tabs: 24 on desktop, 16 or 20 on mobile depending on the page */
  className: string
}

// Figma «Saldo» → Tabs 2:7682: a 1px border-bottom; Tab = label body-medium, padding 10/4/0, gap 10, 2px primary
// indicator under the active one
export function RouteTabs({ label, tabs, className }: RouteTabsProps) {
  const pathname = usePathname()

  return (
    <nav
      aria-label={label}
      className={cn('scrollbar-none flex min-w-0 items-end overflow-x-auto border-b border-border', className)}
    >
      {tabs.map((tab) => {
        const active = tab.exact ? pathname === tab.href : pathname.startsWith(tab.href)

        return (
          <Link
            key={tab.href}
            href={tab.href as Route}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex shrink-0 cursor-pointer flex-col items-center gap-2.5 whitespace-nowrap rounded-xs px-1 pt-2.5 text-body font-medium outline-none focus-visible:ring-2 focus-visible:ring-primary',
              active ? 'text-text-primary' : 'text-text-secondary hover:text-text-primary',
            )}
          >
            {tab.label}
            <span className={cn('h-0.5 self-stretch rounded-full', active && 'bg-primary')} />
          </Link>
        )
      })}
    </nav>
  )
}
