'use client'

import type { Route } from 'next'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils/cn.utils'

const TABS = [
  {
    key: 'general',
    href: '/settings',
  },
  {
    key: 'access',
    href: '/settings/access',
  },
  {
    key: 'notifications',
    href: '/settings/notifications',
  },
  {
    key: 'currencies',
    href: '/settings/currencies',
  },
  {
    key: 'data',
    href: '/settings/data',
  },
] as const

// Figma «Saldo» → Settings, Tabs 2:30898: gap 24, 1px border-bottom; Tab = label body-medium (text-primary when
// active, else text-secondary), padding 10/4/0, 2px primary indicator under the active one. Figma order; Security has
// no feature yet, so its tab is left out. Phones have no tabs: the section list 2:35769 at /settings leads to each page.
export function SettingsTabs() {
  const pathname = usePathname()
  const translate = useTranslations('settings')

  return (
    <nav aria-label={translate('tabsLabel')} className="hidden items-end gap-6 border-b border-border lg:flex">
      {TABS.map((tab) => {
        // phones open General at /settings/general, the desktop tab stays /settings
        const active = pathname === tab.href || (tab.key === 'general' && pathname === '/settings/general')

        return (
          <Link
            key={tab.key}
            href={tab.href as Route}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex cursor-pointer flex-col items-center gap-2.5 rounded-xs px-1 pt-2.5 text-body font-medium outline-none focus-visible:ring-2 focus-visible:ring-primary',
              active ? 'text-text-primary' : 'text-text-secondary hover:text-text-primary',
            )}
          >
            {translate(`tabs.${tab.key}`)}
            <span className={cn('h-0.5 self-stretch rounded-full', active && 'bg-primary')} />
          </Link>
        )
      })}
    </nav>
  )
}
