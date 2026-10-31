'use client'

import { useTranslations } from 'next-intl'
import { Banner } from '@/components/ui/banner.component'
import { Bone, SkeletonCard, SkeletonLine } from '@/components/ui/skeleton.component'
import { useCanWrite, useLedgerStore } from '@/contexts/ledger.context'
import { useOverview } from '../hooks/overview.hook'
import { AccountsCard } from './accounts-card.component'
import { HeroAvailable } from './hero-available.component'
import { MonthCard } from './month-card.component'
import { OverviewWelcome } from './overview-welcome.component'
import { UpcomingCard } from './upcoming-card.component'

// Figma «Saldo» → Overview 2:8237 (desktop: hero, then "Upcoming" 2/3 + "Accounts" 1/3) and 2:8735 (mobile: one column).
// reserves, auto and taxes cards are hidden in Figma until their phases (4, 5, 6, 9): no placeholder rows.
export function OverviewScreen() {
  const { data, isPending, isError } = useOverview()
  const translateCommon = useTranslations('overview')
  const canWrite = useCanWrite()
  const space = useLedgerStore((ledger) => ledger.ledgers.find((item) => item.id === ledger.ledgerId)?.name ?? '')

  if (isPending) {
    return (
      // Figma overview loading frame 5:89183: the hero card (padding 32, gap 16, bars 180×16, 320×48, 420×14) and a row
      // of a flex card and a 400 one (padding 24, gap 20, a title bar and three lines)
      <div aria-busy className="flex flex-col gap-4 lg:gap-6">
        <SkeletonCard className="gap-4 p-5 lg:p-8">
          <Bone className="h-4 w-45 max-w-full rounded-sm" />
          <Bone className="h-12 w-80 max-w-full rounded-sm" />
          <Bone className="h-3.5 w-105 max-w-full rounded-sm" />
        </SkeletonCard>
        <div className="flex flex-col gap-4 lg:flex-row lg:gap-6">
          <SkeletonCard className="gap-5 p-5 lg:flex-1 lg:p-6">
            <Bone className="h-5 w-45 rounded-sm" />
            <SkeletonLine end="w-24" />
            <SkeletonLine end="w-24" />
            <SkeletonLine end="w-24" />
          </SkeletonCard>
          <SkeletonCard className="gap-5 p-5 lg:w-100 lg:p-6">
            <Bone className="h-5 w-30 rounded-sm" />
            <SkeletonLine />
            <SkeletonLine />
            <SkeletonLine />
          </SkeletonCard>
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

  // Figma first run 5:87358: no accounts, the Welcome card replaces everything else
  if (data.accounts.length === 0) {
    return (
      <div className="flex flex-col gap-4 lg:gap-6">
        {canWrite ? null : <Banner>{translateCommon('viewOnly', { space })}</Banner>}
        <OverviewWelcome />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 lg:gap-6">
      {/* Figma viewer 5:90719: an Info banner above the hero */}
      {canWrite ? null : <Banner>{translateCommon('viewOnly', { space })}</Banner>}
      <HeroAvailable overview={data} />
      {/* Figma 2:8237 rows: the left card flex 1, the right one 400, gap 24; cards in a row share the height */}
      <div className="flex flex-col gap-4 lg:flex-row lg:gap-6">
        <div className="flex flex-col *:flex-1 lg:min-w-0 lg:flex-1">
          <UpcomingCard overview={data} />
        </div>
        <div className="flex flex-col *:flex-1 lg:w-100 lg:shrink-0">
          <AccountsCard overview={data} />
        </div>
      </div>
      {/* Figma: the month card alone, full width (reserves, auto and taxes cards are hidden until their phases) */}
      <div className="flex flex-col *:flex-1">
        <MonthCard overview={data} />
      </div>
    </div>
  )
}
