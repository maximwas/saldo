import { Suspense } from 'react'
import { SubscriptionsScreen } from '@/features/subscriptions/components/subscriptions-screen.component'

// ?state=, ?sub= and ?tab= are read on the client: Suspense keeps the shell static (cacheComponents)
export default function SubscriptionsPage() {
  return (
    <Suspense>
      <SubscriptionsScreen />
    </Suspense>
  )
}
