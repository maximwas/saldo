'use client'

import type { Route } from 'next'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils/cn.utils'

const TABS = [
  {
    key: 'paymentsUpcoming',
    href: '/payments',
  },
  {
    key: 'subscriptions',
    href: '/payments/subscriptions',
  },
  {
    key: 'credits',
    href: '/payments/credits',
  },
  {
    key: 'debts',
    href: '/payments/debts',
  },
] as const

// Figma «Saldo» → Upcoming payments 2:12213 (desktop) / 2:13286 (mobile): Tabs gap 24 (16 on mobile) over a 1px
// border-bottom; Tab = label body-medium, padding 10/4/0, gap 10, 2px primary indicator under the active one; on
// mobile the last tab reads «Debts» (5:86541)
export function PaymentsTabs() {
  const pathname = usePathname()
  const translate = useTranslations('nav')

  return (
    <nav aria-label={translate('payments')} className="flex items-end gap-4 border-b border-border lg:gap-6">
      {TABS.map((tab) => {
        const active = tab.href === '/payments' ? pathname === tab.href : pathname.startsWith(tab.href)

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
            {tab.key === 'debts' ? (
              <>
                <span className="lg:hidden">{translate('debtsShort')}</span>
                <span className="max-lg:hidden">{translate('debts')}</span>
              </>
            ) : (
              translate(tab.key)
            )}
            <span className={cn('h-0.5 self-stretch rounded-full', active && 'bg-primary')} />
          </Link>
        )
      })}
    </nav>
  )
}
