'use client'

import { useQuery } from '@tanstack/react-query'
import { useFormatter, useTranslations } from 'next-intl'
import { statisticsQueries } from '../api/statistics.queries'
import { useStatisticsFilters } from '../hooks/statistics-filters.hook'
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
    <p role="status" className="rounded-inner bg-warning-soft px-4 py-3 text-label text-warning-text">
      {translate('state.stale', {
        time: format.dateTime(query.dataUpdatedAt, {
          hour: '2-digit',
          minute: '2-digit',
        }),
      })}
    </p>
  )
}

export function StatisticsScreen() {
  return (
    <div className="flex flex-col gap-4 lg:gap-6">
      <StatisticsFilters />
      <OfflineBanner />
      <SummaryCards />
      <div className="grid gap-4 lg:grid-cols-2 lg:gap-6">
        <CategoriesCard />
        <CashflowCard />
        <BudgetCard />
        <ForecastCard />
        <SubscriptionsCard />
        <CreditsCard />
      </div>
    </div>
  )
}
