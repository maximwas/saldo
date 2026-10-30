import { Suspense } from 'react'
import { CalendarScreen } from '@/features/calendar/components/calendar-screen.component'
import { ObligationSheetsHost } from '@/features/obligations/components/obligation-sheets-host.component'

// The view, the day and the filter are URL state read on the client: Suspense keeps the shell static (cacheComponents).
// «Paid» and «Change the date» of a plan are the obligation sheets (?pay= / ?move=), composed here because features
// never import each other.
export default function CalendarPage() {
  return (
    <Suspense>
      <CalendarScreen />
      <ObligationSheetsHost />
    </Suspense>
  )
}
