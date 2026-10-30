'use client'

import type { Route } from 'next'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { MORE_SECTION, TAB_BAR_SECTIONS } from '@/constants/navigation.constants'
import { SHELL_TEXT } from '@/constants/shell.constants'
import { cn } from '@/lib/utils/cn.utils'
import { activeHref, isMoreActive } from './navigation.utils'

// Figma «Saldo» → TabBar 2:8207 (padding 6/8/24, top border) of TabBarItem 2:8206 (icon 24, text/micro, 60 high)
export function TabBar() {
  const pathname = usePathname()
  const current = activeHref(
    pathname,
    TAB_BAR_SECTIONS.filter((s) => s !== MORE_SECTION),
  )

  return (
    <nav
      aria-label={SHELL_TEXT.navLabel}
      className="fixed inset-x-0 bottom-0 z-40 flex border-t border-border bg-card px-2 pt-1.5 pb-6 lg:hidden"
    >
      {TAB_BAR_SECTIONS.map((section) => {
        const Icon = section.icon
        const active = section === MORE_SECTION ? isMoreActive(pathname) : section.href === current

        return (
          <Link
            key={section.href}
            href={section.href as Route}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex min-w-0 flex-1 flex-col items-center gap-1 py-2 text-micro outline-none focus-visible:ring-2 focus-visible:ring-primary',
              active ? 'text-primary-text' : 'text-text-tertiary',
            )}
          >
            <Icon aria-hidden size={24} className={cn(active && 'text-primary')} />
            <span className="truncate">{section.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
