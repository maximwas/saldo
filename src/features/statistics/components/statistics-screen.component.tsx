'use client'

import { useQuery } from '@tanstack/react-query'
import { ChartColumn } from 'lucide-react'
import { useFormatter, useLocale, useTranslations } from 'next-intl'
import { PageOfflineBanner } from '@/components/layout/page-offline-banner.component'
import { Button } from '@/components/ui/button.component'
import { EmptyState } from '@/components/ui/empty-state.component'
import { ErrorState } from '@/components/ui/error-state.component'
import { Bone, SkeletonCard } from '@/components/ui/skeleton.component'
import { useScreenQueryState } from '@/lib/query/screen-query-state.hook'
import { statisticsQueries } from '../api/statistics.queries'
import { useStatisticsFilters } from '../hooks/statistics-filters.hook'
import { cashflowTotals } from '../utils/statistics.utils'
import { BudgetCard } from './budget-card.component'
import { CashflowCard } from './cashflow-card.component'
import { CategoriesCard } from './categories-card.component'
import { CreditsCard } from './credits-card.component'
import { ForecastCard } from './forecast-card.component'
import { StatisticsFilters } from './statistics-filters.component'
import { SubscriptionsCard } from './subscriptions-card.component'
import { SummaryCards } from './summary-cards.component'

// Figma «Saldo» → Statistics: 2:73594 / 2:77703 (desktop chart and table), 2:78033 / 4:79439 (mobile); states in
// section 2:73593: 41:109346 empty, 41:109639 loading, 41:109930 first load failed, 41:110223 offline with cache. Auto, reserves, goals and taxes blocks wait for their phases.
// Figma 4:79708: a summary card (two lines and a block) and a card with a bar, a 180 circle and two lines, all subtle
function StatisticsSkeleton() {
  return (
    <div aria-busy className="flex flex-col gap-4 lg:gap-6">
      <SkeletonCard className="gap-3 p-5">
        <Bone className="h-4 rounded-full" />
        <Bone className="h-4 rounded-full" />
        <Bone className="h-8 rounded-inner" />
      </SkeletonCard>
      <SkeletonCard className="items-center gap-4 p-5">
        <Bone className="h-5 w-full rounded-full" />
        <Bone className="size-45 rounded-full" />
        <Bone className="h-4 w-full rounded-full" />
        <Bone className="h-4 w-full rounded-full" />
      </SkeletonCard>
    </div>
  )
}

// Figma 4:79641: a card with a 40 chart icon, the title, a secondary text and a secondary «Show <month>» button
function EmptyPeriod() {
  const translate = useTranslations('statistics')
  const locale = useLocale()
  const format = useFormatter()
  const { today, period, setUrl } = useStatisticsFilters()
  const monthName = (value: string) =>
    format
      .dateTime(new Date(`${value}-15T12:00:00Z`), {
        month: 'long',
        timeZone: 'UTC',
      })
      .toLocaleLowerCase(locale)
  const current = today.slice(0, 7)

  return (
    <EmptyState
      icon={ChartColumn}
      tone="blue"
      title={
        period.length === 7
          ? translate('emptyPeriod.title', { month: monthName(period) })
          : translate('emptyPeriod.titleOther')
      }
      hint={translate('emptyPeriod.text')}
      action={
        period !== current && (
          <Button
            variant="secondary"
            onClick={() =>
              setUrl({
                period: null,
                bucket: null,
              })
            }
          >
            {translate('emptyPeriod.show', { month: monthName(current) })}
          </Button>
        )
      }
    />
  )
}

export function StatisticsScreen() {
  const translate = useTranslations('statistics')
  const { params } = useStatisticsFilters()
  const query = useQuery(statisticsQueries.cashflow(params))
  const { failedLoad, retry } = useScreenQueryState([query], translate('refreshFailed'))
  const pending = query.data === undefined && !failedLoad && query.fetchStatus !== 'paused'
  const empty = query.data !== undefined && cashflowTotals(query.data).operationsCount === 0

  return (
    <div className="flex flex-col gap-4 lg:gap-6">
      <PageOfflineBanner text={(time) => translate('state.stale', { time })} />
      <StatisticsFilters />
      {pending && <StatisticsSkeleton />}
      {empty && <EmptyPeriod />}
      {failedLoad && <ErrorState title={translate('loadFailed')} onRetryAction={retry} />}
      {!pending && !empty && !failedLoad && (
        <>
          <SummaryCards />
          <div className="grid gap-4 lg:grid-cols-2 lg:gap-6">
            <CategoriesCard />
            <CashflowCard />
            <BudgetCard />
            <ForecastCard />
            <SubscriptionsCard />
            <CreditsCard />
          </div>
        </>
      )}
    </div>
  )
}
