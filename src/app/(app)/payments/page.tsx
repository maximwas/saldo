import { Suspense } from 'react'
import { ObligationsScreen } from '@/features/obligations/components/obligations-screen.component'

// the ?pay= state is read on the client: Suspense keeps the shell static (cacheComponents)
export default function PaymentsPage() {
  return (
    <Suspense>
      <ObligationsScreen />
    </Suspense>
  )
}
