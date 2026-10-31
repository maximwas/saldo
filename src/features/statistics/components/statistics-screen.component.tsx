'use client'

import { useQuery } from '@tanstack/react-query'
import { ChartColumn } from 'lucide-react'
import { useFormatter, useLocale, useTranslations } from 'next-intl'
import { useEffect } from 'react'
import { Banner } from '@/components/ui/banner.component'
import { Button } from '@/components/ui/button.component'
import { Bone, SkeletonCard } from '@/components/ui/skeleton.component'
import { notify } from '@/components/ui/toaster.component'
import { CATEGORY_TONES } from '@/constants/category-colors.constants'
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

// Figma «Saldo» → Statistics: 2:73594 / 2:77703 (desktop chart and table), 2:78033 / 4:79439 (mobile), 4:79641 empty,
// 4:79708 loading, 4:79761 error and offline. Auto, reserves, goals and taxes blocks wait for their phases.
function OfflineBanner() {
  const translate = useTranslations('statistics')
  const format = useFormatter()
  const { params } = useStatisticsFilters()
  const query = useQuery(statisticsQueries.cashflow(params))

  // paused with data = offline: the figures are the last loaded ones
  if (!query.data || query.fetchStatus !== 'paused') {
    return null
  }

  return (
    <Banner kind="warning" role="status">
      {translate('state.stale', {
        time: format.dateTime(query.dataUpdatedAt, {
          hour: '2-digit',
          minute: '2-digit',
        }),
      })}
    </Banner>
  )
}

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
    <section className="flex flex-col items-center gap-3 rounded-card bg-card px-5 py-8 text-center shadow-card">
      <span aria-hidden className={`flex size-10 items-center justify-center rounded-full ${CATEGORY_TONES.blue}`}>
        <ChartColumn className="size-5" />
      </span>
      <h2 className="text-body font-semibold text-text-primary">
        {period.length === 7
          ? translate('emptyPeriod.title', { month: monthName(period) })
          : translate('emptyPeriod.titleOther')}
      </h2>
      <p className="text-label text-text-secondary">{translate('emptyPeriod.text')}</p>
      {period !== current && (
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
      )}
    </section>
  )
}

export function StatisticsScreen() {
  const translate = useTranslations('statistics')
  const { params } = useStatisticsFilters()
  const query = useQuery(statisticsQueries.cashflow(params))
  const failedRefresh = query.isError && query.data !== undefined

  // one toast per failed refresh, not per render
  // biome-ignore lint/correctness/useExhaustiveDependencies: keyed on the failure time on purpose
  useEffect(() => {
    if (failedRefresh) {
      notify.error(translate('state.refreshFailed'), { onRetry: () => void query.refetch() })
    }
  }, [failedRefresh, query.errorUpdatedAt])

  const pending = query.data === undefined && !query.isError && query.fetchStatus !== 'paused'
  const empty = query.data !== undefined && cashflowTotals(query.data).operationsCount === 0

  return (
    <div className="flex flex-col gap-4 lg:gap-6">
      <OfflineBanner />
      <StatisticsFilters />
      {pending && <StatisticsSkeleton />}
      {empty && <EmptyPeriod />}
      {!pending && !empty && (
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
