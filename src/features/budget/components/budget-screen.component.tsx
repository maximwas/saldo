'use client'

import { useFormatter, useTranslations } from 'next-intl'
import { useEffect } from 'react'
import { Banner } from '@/components/ui/banner.component'
import { ErrorState } from '@/components/ui/error-state.component'
import { notify } from '@/components/ui/toaster.component'
import { useCanWrite } from '@/contexts/ledger.context'
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
  const format = useFormatter()
  const canWrite = useCanWrite()
  const { month, data, isPending, isError, refetch, fetchStatus, dataUpdatedAt, errorUpdatedAt } = useCurrentBudget()
  const failedRefresh = isError && data !== undefined

  // one toast per failed refresh, not per render
  // biome-ignore lint/correctness/useExhaustiveDependencies: keyed on the failure time on purpose
  useEffect(() => {
    if (failedRefresh) {
      notify.error(translate('refreshFailed'), { onRetry: () => void refetch() })
    }
  }, [failedRefresh, errorUpdatedAt])

  if (isPending) {
    return (
      <div className="flex flex-col gap-4 lg:gap-6">
        <BudgetTabs />
        <BudgetSkeleton />
      </div>
    )
  }

  // the first load failed: nothing cached to show
  if (data === undefined) {
    return (
      <div className="flex flex-col gap-4 lg:gap-6">
        <BudgetTabs />
        <ErrorState title={translate('loadFailed')} onRetryAction={refetch} />
      </div>
    )
  }

  // no row for the month and no limit: nothing was planned (an income plan alone is a budget)
  const planned = data.monthId !== null && (data.incomePlanMinor !== null || data.facts.some((fact) => fact.limitId))

  return (
    <>
      <div className="flex flex-col gap-4 lg:gap-6">
        {canWrite ? null : <Banner>{translate('viewOnly')}</Banner>}
        {/* paused with data = offline: the figures are the last loaded ones */}
        {fetchStatus === 'paused' ? (
          <Banner kind="warning" role="status" className="max-lg:hidden">
            {translate('stale', {
              time: format.dateTime(dataUpdatedAt, {
                hour: '2-digit',
                minute: '2-digit',
              }),
            })}
          </Banner>
        ) : null}
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
