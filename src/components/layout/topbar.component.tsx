'use client'

import { usePathname } from 'next/navigation'
import { useFormatter, useTranslations } from 'next-intl'
import { Suspense } from 'react'
import { useClock } from '@/contexts/clock.context'
import { useLedger } from '@/contexts/ledger.context'
import { switchLedger } from '@/features/ledgers/api/ledgers.actions'
import { NotificationBell } from '@/features/notifications/components/notification-bell.component'
import { SearchPalette } from '@/features/search/components/search-palette.component'
import { cn } from '@/lib/utils/cn.utils'
import { AddButton } from './add-button.component'
import { pageTitleKey } from './navigation.utils'
import { SpaceSwitcher } from './space-switcher.component'

// Figma «Saldo» → Topbar 2:8195. Desktop (lg): padding 24/32, page-title, search 280, bell 44, Add button.
// Mobile: padding 12/20 on app, SpaceSwitcher over a display/number title, bell 40 with a 44 hit area.
export function Topbar() {
  const pathname = usePathname()
  const ledger = useLedger()
  const { now, timeZone } = useClock()
  const translateNav = useTranslations('nav')
  const translateCommon = useTranslations('common')
  const formatter = useFormatter()
  const titleKey = pageTitleKey(pathname)
  // Figma 11:73245: the mobile Topbar is the title and the bell only, the space card below says the rest
  const spacePage = pathname === '/space'
  // the space's zone, not the browser's: «today» is the same for both people in a shared space
  const today = formatter.dateTime(now(), {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone,
  })

  return (
    <header className="flex items-center justify-between gap-4 bg-app px-5 py-3 lg:px-8 lg:py-6">
      <div className="flex min-w-0 flex-col gap-0.5 lg:flex-1">
        <div className={cn('lg:hidden', spacePage && 'hidden')}>
          <SpaceSwitcher
            spaces={ledger.ledgers}
            currentId={ledger.ledgerId}
            platform="topbar"
            onSelectAction={switchLedger}
          />
        </div>
        <h1 className="truncate font-display text-number text-text-primary lg:text-page-title">
          {titleKey ? translateNav(titleKey) : translateCommon('brand')}
        </h1>
        {/* Subtitle: text/label on mobile, text/body on desktop (Topbar 2:8195) */}
        <p
          className={cn(
            'text-label text-text-secondary first-letter:uppercase lg:text-body',
            spacePage && 'max-lg:hidden',
          )}
        >
          {today}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <SearchPalette />
        <NotificationBell />
        {/* nuqs reads the URL, so the button waits in Suspense while the shell stays static */}
        <Suspense fallback={null}>
          <AddButton />
        </Suspense>
      </div>
    </header>
  )
}
