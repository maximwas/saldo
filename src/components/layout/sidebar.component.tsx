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
import { AccountMenu } from './account-menu.component'
import { Brand } from './brand.component'
import { activeHref, soonSection } from './navigation.utils'
import { SoonBadge } from './soon-badge.component'
import { SpaceSwitcher } from './space-switcher.component'
import { SyncIndicator } from './sync-indicator.component'

type NavItemProps = {
  section: NavSection
  active: boolean
}

// Figma «Saldo» → NavItem 2:8110: 44 high, icon 20, Default / Hover (subtle) / Active (primary-soft)
function NavItem({ section, active }: NavItemProps) {
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
      {soonSection(section.href) ? <SoonBadge /> : null}
    </Link>
  )
}

type NavSubItemProps = {
  link: NavLink
  active: boolean
}

// Figma «Saldo» → NavSubItem 2:11282: 36 high, a 20 indent in place of the icon, Active has no fill
function NavSubItem({ link, active }: NavSubItemProps) {
  const translate = useTranslations('nav')
  const soon = soonSection(link.href) !== null

  return (
    <Link
      href={link.href as Route}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex min-h-9 shrink-0 items-center gap-3 rounded-md px-3 py-1.5 text-label outline-none hover:bg-subtle focus-visible:ring-2 focus-visible:ring-primary',
        active ? 'font-semibold text-primary-text' : 'font-medium text-text-secondary',
      )}
    >
      <span aria-hidden className="size-5 shrink-0" />
      {/* a «soon» item wraps instead of cutting its name next to the badge */}
      <span className={cn('flex-1', !soon && 'truncate')}>{translate(link.key)}</span>
      {soon ? <SoonBadge /> : null}
    </Link>
  )
}

// Figma «Saldo» → Sidebar 2:11401: Expanded=true opens the active section's sub-items; «Show space» on
export function Sidebar() {
  const pathname = usePathname()
  const ledger = useLedger()
  const translate = useTranslations('shell')
  const sections = [...SIDEBAR_SECTIONS, SIDEBAR_FOOTER_SECTION]
  const current = activeHref(pathname, sections)

  return (
    <aside className="sticky top-0 hidden h-dvh w-(--sidebar-w) shrink-0 flex-col gap-1 overflow-y-auto border-r border-border bg-card px-4 py-6 lg:flex">
      <Brand className="px-2 pb-6" />
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
          // a section that is not built yet opens no sub-items: its sub-pages say the same «soon»
          const children = active && !soonSection(section.href) ? section.children : undefined
          const currentChild = children ? activeHref(pathname, children) : null

          return [
            <NavItem key={section.href} section={section} active={active} />,
            ...(children ?? []).map((link) => (
              <NavSubItem key={`sub${link.href}`} link={link} active={link.href === currentChild} />
            )),
          ]
        })}
        <div className="flex-1" />
        <SyncIndicator />
        <NavItem section={SIDEBAR_FOOTER_SECTION} active={SIDEBAR_FOOTER_SECTION.href === current} />
      </nav>
      {/* Figma Sidebar 2:11401: my account under a divider at the very bottom */}
      <div className="mt-3 border-t border-border pt-3">
        <AccountMenu />
      </div>
    </aside>
  )
}
