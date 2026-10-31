'use client'

import { useTranslations } from 'next-intl'
import { useCurrentBudget } from '../hooks/budget.hook'
import { BudgetEmpty } from './budget-empty.component'
import { BudgetSheets } from './budget-sheets.component'
import { LimitsCard } from './limits-card.component'
import { MonthCard } from './month-card.component'

// Figma frame 2:12799 (desktop) / 2:16101 (mobile). Loading 2:28961, empty 2:28501, error 2:29418,
// viewer 2:29871 (no write buttons: useCanWrite in the cards).
export function BudgetScreen() {
  const translate = useTranslations('budget')
  const { month, data, isPending, isError } = useCurrentBudget()

  if (isPending) {
    return <div aria-busy className="h-96 rounded-card bg-subtle" />
  }

  if (isError) {
    return (
      <p role="alert" className="text-body text-negative-text">
        {translate('loadFailed')}
      </p>
    )
  }

  // no row for the month and no limit: nothing was planned (an income plan alone is a budget)
  const planned = data.monthId !== null && (data.incomePlanMinor !== null || data.facts.some((fact) => fact.limitId))

  return (
    <>
      <div className="flex flex-col gap-4 lg:gap-6">
        {planned ? (
          <>
            <MonthCard data={data} month={month} />
            <LimitsCard facts={data.facts} month={month} />
          </>
        ) : (
          <BudgetEmpty month={month} />
        )}
      </div>
      <BudgetSheets />
    </>
  )
}
