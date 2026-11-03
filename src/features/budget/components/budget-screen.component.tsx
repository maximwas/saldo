'use client'

import { useTranslations } from 'next-intl'
import { Banner } from '@/components/ui/banner.component'
import { ErrorState } from '@/components/ui/error-state.component'
import { useCanWrite } from '@/contexts/ledger.context'
import { useCurrentBudget } from '../hooks/budget.hook'
import { BudgetEmpty } from './budget-empty.component'
import { BudgetSheets } from './budget-sheets.component'
import { BudgetSkeleton } from './budget-skeleton.component'
import { BudgetTabs } from './budget-tabs.component'
import { LimitsCard } from './limits-card.component'
import { MonthCard } from './month-card.component'

// Figma frame 2:12799 (desktop) / 2:16101 (mobile). Loading 2:28961, empty 2:28501, viewer 2:29871 (the banner above the
// tabs, no write buttons), offline + save error 2:29418 (the shell's offline banner and the save toast).
export function BudgetScreen() {
  const translate = useTranslations('budget')
  const canWrite = useCanWrite()
  const { month, data, isPending, isError, refetch } = useCurrentBudget()

  if (isPending) {
    return (
      <div className="flex flex-col gap-4 lg:gap-6">
        <BudgetTabs />
        <BudgetSkeleton />
      </div>
    )
  }

  if (isError) {
    return <ErrorState title={translate('loadFailed')} onRetryAction={refetch} />
  }

  // no row for the month and no limit: nothing was planned (an income plan alone is a budget)
  const planned = data.monthId !== null && (data.incomePlanMinor !== null || data.facts.some((fact) => fact.limitId))

  return (
    <>
      <div className="flex flex-col gap-4 lg:gap-6">
        {canWrite ? null : <Banner>{translate('viewOnly')}</Banner>}
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
