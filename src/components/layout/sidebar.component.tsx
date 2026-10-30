'use client'

import type { Route } from 'next'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import {
  type NavLink,
  type NavSection,
  SIDEBAR_FOOTER_SECTION,
  SIDEBAR_SECTIONS,
} from '@/constants/navigation.constants'
import { useLedger } from '@/contexts/ledger.context'
import { switchLedger } from '@/features/ledgers/api/ledgers.actions'
import { cn } from '@/lib/utils/cn.utils'
import { activeHref } from './navigation.utils'
import { SpaceSwitcher } from './space-switcher.component'
import { SyncStatus } from './sync-status.component'

// Figma «Saldo» → NavItem 2:8110: 44 high, icon 20, Default / Hover (subtle) / Active (primary-soft)
function NavItem({ section, active }: { section: NavSection; active: boolean }) {
  const translate = useTranslations('nav')
  const Icon = section.icon

  return (
    <Link
      href={section.href as Route}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex h-11 shrink-0 items-center gap-3 rounded-md px-3 text-body outline-none focus-visible:ring-2 focus-visible:ring-primary',
        active ? 'bg-primary-soft font-semibold text-primary-text' : 'font-medium text-text-secondary hover:bg-subtle',
      )}
    >
      <Icon aria-hidden size={20} className={cn('shrink-0', active && 'text-primary')} />
      <span className="flex-1 truncate">{translate(section.key)}</span>
    </Link>
  )
}

// Figma «Saldo» → NavSubItem 2:11282: 36 high, a 20 indent in place of the icon, Active has no fill
function NavSubItem({ link, active }: { link: NavLink; active: boolean }) {
  const translate = useTranslations('nav')

  return (
    <Link
      href={link.href as Route}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex h-9 shrink-0 items-center gap-3 rounded-md px-3 text-label outline-none hover:bg-subtle focus-visible:ring-2 focus-visible:ring-primary',
        active ? 'font-semibold text-primary-text' : 'font-medium text-text-secondary',
      )}
    >
      <span aria-hidden className="size-5 shrink-0" />
      <span className="flex-1 truncate">{translate(link.key)}</span>
    </Link>
  )
}

// Figma «Saldo» → Sidebar 2:11401: Expanded=true opens the active section's sub-items; «Show space» on
export function Sidebar() {
  const pathname = usePathname()
  const ledger = useLedger()
  const translate = useTranslations('shell')
  const brand = useTranslations('common')('brand')
  const sections = [...SIDEBAR_SECTIONS, SIDEBAR_FOOTER_SECTION]
  const current = activeHref(pathname, sections)

  return (
    <aside className="sticky top-0 hidden h-dvh w-(--sidebar-w) shrink-0 flex-col gap-1 overflow-y-auto border-r border-border bg-card px-4 py-6 lg:flex">
      <div className="flex items-center gap-2.5 px-2 pb-6">
        <span
          aria-hidden
          className="flex size-8 items-center justify-center rounded-logo-md bg-primary text-body font-semibold text-on-primary"
        >
          {brand.charAt(0)}
        </span>
        <span className="text-card-title text-text-primary">{brand}</span>
      </div>
      <div className="pb-3">
        <SpaceSwitcher
          spaces={ledger.ledgers}
          currentId={ledger.ledgerId}
          platform="sidebar"
          onSelectAction={switchLedger}
        />
      </div>
      <nav aria-label={translate('navLabel')} className="flex flex-1 flex-col gap-1">
        {SIDEBAR_SECTIONS.map((section) => {
          const active = section.href === current
          const children = active ? section.children : undefined
          const currentChild = children ? activeHref(pathname, children) : null

          return [
            <NavItem key={section.href} section={section} active={active} />,
            ...(children ?? []).map((link) => (
              <NavSubItem key={`sub${link.href}`} link={link} active={link.href === currentChild} />
            )),
          ]
        })}
        <div className="flex-1" />
        {/* shortcut: static «synced» until the offline queue (phase 8) reports its state */}
        <SyncStatus state="synced" label={translate('synced')} />
        <NavItem section={SIDEBAR_FOOTER_SECTION} active={SIDEBAR_FOOTER_SECTION.href === current} />
      </nav>
    </aside>
  )
}
