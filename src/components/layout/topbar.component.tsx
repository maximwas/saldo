'use client'

import { Bell, Plus, Search } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button.component'
import { SHELL_TEXT } from '@/constants/shell.constants'
import { pageTitle } from './navigation.utils'
import { type Space, SpaceSwitcher } from './space-switcher.component'

type TopbarProps = { spaces: readonly Space[]; currentSpaceId: string }

// Figma «Saldo» → Topbar 2:8195. Desktop (lg): padding 24/32, page-title, search 280, bell 44, Add button.
// Mobile: padding 12/20 on app, SpaceSwitcher over a display/number title, bell 40 with a 44 hit area.
// shortcut: no date subtitle until ClockProvider (P0-B) gives a prerender-safe «today»
export function Topbar({ spaces, currentSpaceId }: TopbarProps) {
  const pathname = usePathname()
  const canWrite = spaces.find((space) => space.id === currentSpaceId)?.role !== 'viewer'

  return (
    <header className="flex items-center justify-between gap-4 bg-app px-5 py-3 lg:px-8 lg:py-6">
      <div className="flex min-w-0 flex-col gap-0.5 lg:flex-1">
        <div className="lg:hidden">
          <SpaceSwitcher spaces={spaces} currentId={currentSpaceId} platform="topbar" />
        </div>
        <h1 className="truncate font-display text-number text-text-primary lg:text-page-title">
          {pageTitle(pathname)}
        </h1>
      </div>
      {/* shortcut: search opens nothing until ⌘K search (cmdk) lands */}
      <button
        type="button"
        className="hidden h-11 w-70 items-center gap-2 rounded-md border border-border bg-card px-3 text-body text-text-tertiary outline-none focus-visible:ring-2 focus-visible:ring-primary lg:flex"
      >
        <Search aria-hidden size={20} className="shrink-0" />
        <span className="flex-1 truncate text-left">{SHELL_TEXT.search}</span>
      </button>
      <div className="flex items-center gap-3">
        <Link
          href="/notifications"
          aria-label={SHELL_TEXT.notifications}
          className="relative flex size-10 items-center justify-center rounded-md border border-border bg-card text-text-secondary outline-none after:absolute after:-inset-0.5 focus-visible:ring-2 focus-visible:ring-primary lg:size-11 lg:after:inset-0"
        >
          <Bell aria-hidden size={20} />
        </Link>
        {/* shortcut: Add opens the ?add= sheet once the operations feature exists */}
        {canWrite && (
          <Button className="hidden lg:inline-flex">
            <Plus aria-hidden size={20} />
            {SHELL_TEXT.add}
          </Button>
        )}
      </div>
    </header>
  )
}
