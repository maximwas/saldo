'use client'

import { ChevronLeft } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useFormatter, useTranslations } from 'next-intl'
import { Suspense, useEffect } from 'react'
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
// A settings subpage on a phone is a page of its own («Platform=Mobile Back» 45:120247): a 40 back button to the
// section list, the subpage title, the bell; no space, no date. Every settings page and Statistics on desktop have the
// space as their subtitle instead of the date (Settings, Data desktop 43:116906, the Statistics desktop frame).
const SETTINGS_SUBPAGES = ['general', 'access', 'notifications', 'currencies', 'security', 'data'] as const

export function Topbar() {
  const pathname = usePathname()
  const ledger = useLedger()
  const { now, timeZone } = useClock()
  const translateNav = useTranslations('nav')
  const translateCommon = useTranslations('common')
  const translateSettings = useTranslations('settings')
  const formatter = useFormatter()
  const titleKey = pageTitleKey(pathname)
  // Figma 11:73245: the mobile Topbar is the title and the bell only, the space card below says the rest
  const spacePage = pathname === '/space'
  const subpage = SETTINGS_SUBPAGES.find((key) => pathname === `/settings/${key}`)
  const title = titleKey ? translateNav(titleKey) : translateCommon('brand')
  const tabTitle = titleKey ? `${title} · ${translateCommon('brand')}` : title
  const spaceSubtitle = pathname === '/settings' || subpage !== undefined || pathname === '/statistics'
  const spaceName = ledger.ledgers.find((item) => item.id === ledger.ledgerId)?.name ?? ''
  // the space's zone, not the browser's: «today» is the same for both people in a shared space
  const today = formatter.dateTime(now(), {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone,
  })

  // the browser tab names the screen (QA2 #17): the root metadata gives every page «Saldo», the shell knows the screen
  useEffect(() => {
    document.title = tabTitle
  }, [tabTitle])

  return (
    <header className="flex items-center justify-between gap-4 bg-app px-5 py-3 lg:px-8 lg:py-6">
      <div className="flex min-w-0 flex-col gap-0.5 lg:flex-1">
        <div className={cn('lg:hidden', (spacePage || subpage) && 'hidden')}>
          <SpaceSwitcher
            spaces={ledger.ledgers}
            currentId={ledger.ledgerId}
            platform="topbar"
            onSelectAction={switchLedger}
          />
        </div>
        <div className="flex min-w-0 items-center gap-3">
          {subpage ? (
            <Link
              href="/settings"
              aria-label={translateSettings('back')}
              className="relative flex size-10 shrink-0 items-center justify-center rounded-md border border-border bg-card text-text-primary outline-none transition-colors after:absolute after:-inset-0.5 hover:bg-subtle focus-visible:ring-2 focus-visible:ring-primary lg:hidden"
            >
              <ChevronLeft aria-hidden size={20} />
            </Link>
          ) : null}
          <h1 className="truncate font-display text-number text-text-primary lg:text-page-title">
            {subpage ? (
              <>
                <span className="lg:hidden">{translateSettings(`tabs.${subpage}`)}</span>
                <span className="max-lg:hidden">{title}</span>
              </>
            ) : (
              title
            )}
          </h1>
        </div>
        {/* Subtitle: text/label on mobile, text/body on desktop (Topbar 2:8195) */}
        <p
          className={cn(
            'text-label text-text-secondary first-letter:uppercase lg:text-body',
            (spacePage || subpage) && 'max-lg:hidden',
          )}
        >
          {spaceSubtitle ? (
            <>
              <span className="lg:hidden">{today}</span>
              <span className="max-lg:hidden">{translateSettings('hub.title', { space: spaceName })}</span>
            </>
          ) : (
            today
          )}
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
