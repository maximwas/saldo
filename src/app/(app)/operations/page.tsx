import { Suspense } from 'react'
import { OperationsScreen } from '@/features/operations/components/operations-screen.component'

// filters live in the URL (nuqs reads useSearchParams), so the screen sits in Suspense and the shell stays static
export default function OperationsPage() {
  return (
    <Suspense>
      <OperationsScreen />
    </Suspense>
  )
}
