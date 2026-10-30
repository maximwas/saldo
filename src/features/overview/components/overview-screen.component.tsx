'use client'

import { useTranslations } from 'next-intl'
import { useOverview } from '../hooks/overview.hook'
import { AccountsCard } from './accounts-card.component'
import { HeroAvailable } from './hero-available.component'
import { MonthCard } from './month-card.component'
import { UpcomingCard } from './upcoming-card.component'

// Figma «Saldo» → Overview 2:8237 (desktop: hero, then "Upcoming" 2/3 + "Accounts" 1/3) and 2:8735 (mobile: one column).
// shortcut: month totals, reserves, auto and taxes cards wait for their phases (4, 5, 6, 9); no placeholder rows.
export function OverviewScreen() {
  const { data, isPending, isError } = useOverview()
  const translateCommon = useTranslations('overview')

  if (isPending) {
    return (
      <div aria-busy className="flex flex-col gap-4 lg:gap-6">
        <div className="h-48 rounded-card bg-subtle lg:h-64" />
        <div className="grid gap-4 lg:grid-cols-3 lg:gap-6">
          <div className="h-64 rounded-card bg-subtle lg:col-span-2" />
          <div className="h-64 rounded-card bg-subtle" />
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <p role="alert" className="text-body text-negative-text">
        {translateCommon('loadFailed')}
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-4 lg:gap-6">
      <HeroAvailable overview={data} />
      <div className="grid gap-4 lg:grid-cols-3 lg:gap-6">
        <div className="lg:col-span-2">
          <UpcomingCard overview={data} />
        </div>
        <AccountsCard overview={data} />
        <div className="lg:col-span-2">
          <MonthCard overview={data} />
        </div>
      </div>
    </div>
  )
}
