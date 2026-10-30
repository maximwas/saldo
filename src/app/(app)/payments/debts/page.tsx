import { Suspense } from 'react'
import { DebtsScreen } from '@/features/debts/components/debts-screen.component'

// a search result links ?id=<debt>: the row reads the URL, so the screen waits in Suspense and the shell stays static
export default function DebtsPage() {
  return (
    <Suspense>
      <DebtsScreen />
    </Suspense>
  )
}
