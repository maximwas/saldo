import { Suspense } from 'react'
import { BudgetScreen } from '@/features/budget/components/budget-screen.component'

// ?month= is read on the client: Suspense keeps the shell static (cacheComponents)
export default function BudgetPage() {
  return (
    <Suspense>
      <BudgetScreen />
    </Suspense>
  )
}
