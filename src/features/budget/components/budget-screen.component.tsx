'use client'

import { useTranslations } from 'next-intl'
import { PageOfflineBanner } from '@/components/layout/page-offline-banner.component'
import { Banner } from '@/components/ui/banner.component'
import { ErrorState } from '@/components/ui/error-state.component'
import { useCanWrite } from '@/contexts/ledger.context'
import { useScreenQueryState } from '@/lib/query/screen-query-state.hook'
import { useHydrated } from '@/lib/utils/hydrated.hook'
import { useCurrentBudget } from '../hooks/budget.hook'
import { BudgetEmpty } from './budget-empty.component'
import { BudgetSheets } from './budget-sheets.component'
import { BudgetSkeleton } from './budget-skeleton.component'
import { BudgetTabs } from './budget-tabs.component'
import { LimitsCard } from './limits-card.component'
import { MonthCard } from './month-card.component'

// Figma frame 2:12799 (desktop) / 2:16101 (mobile). Loading 41:108089 / 2:28961, empty 41:107591 / 2:28501, viewer
// 41:110543 / 2:29871 (the info banner above the tabs, no write buttons), first load failed 41:105596 (the tabs stay,
// ErrorState under them), refresh failed over cached data 41:107107 (a warning banner with the time of the data and an
// error toast; phones keep the shell's offline banner, 2:29418).
export function BudgetScreen() {
  const translate = useTranslations('budget')
  const canWrite = useCanWrite()
  const budget = useCurrentBudget()
  const { month, data } = budget
  const { failedLoad, retry } = useScreenQueryState([budget], translate('refreshFailed'))
  const hydrated = useHydrated()

  if (failedLoad) {
    return (
      <div className="flex flex-col gap-4 lg:gap-6">
        <BudgetTabs />
        <ErrorState title={translate('loadFailed')} onRetryAction={retry} />
      </div>
    )
  }

  if (!hydrated || data === undefined) {
    return (
      <div className="flex flex-col gap-4 lg:gap-6">
        <BudgetTabs />
        <BudgetSkeleton />
      </div>
    )
  }

  // no row for the month and no limit: nothing was planned (an income plan alone is a budget)
  const planned = data.monthId !== null && (data.incomePlanMinor !== null || data.facts.some((fact) => fact.limitId))

  return (
    <>
      <div className="flex flex-col gap-4 lg:gap-6">
        {canWrite ? null : <Banner>{translate('viewOnly')}</Banner>}
        <PageOfflineBanner text={(time) => translate('stale', { time })} />
        <BudgetTabs />
        {planned ? (
          <>
            <MonthCard data={data} month={month} />
            <LimitsCard facts={data.facts} />
          </>
        ) : (
          <BudgetEmpty month={month} />
        )}
      </div>
      <BudgetSheets />
    </>
  )
}
