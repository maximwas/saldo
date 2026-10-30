'use client'

import { CalendarSearch } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button.component'
import { useCalendarData } from '../hooks/calendar.hook'
import { useCalendarParams } from '../hooks/calendar-params.hook'
import { fromFilter } from '../utils/calendar-filters.utils'
import { CalendarDays } from './calendar-days.component'
import { CalendarMonth } from './calendar-month.component'
import { CalendarSets } from './calendar-sets.component'
import { CalendarSummary } from './calendar-summary.component'
import { CalendarToolbar } from './calendar-toolbar.component'
import { DayPanel } from './day-panel.component'

// Figma «Saldo» → Calendar · Empty by filter 2:77407: an icon, «Nothing matches the filter», a line and «Reset filters»
function EmptyPeriod() {
  const translate = useTranslations('calendar')
  const { filter, setUrl } = useCalendarParams()
  const filtered = Object.keys(filter).length > 0

  return (
    <div className="flex flex-col items-center gap-3 rounded-card bg-card px-6 py-12 text-center shadow-card">
      <span
        aria-hidden
        className="flex size-10 items-center justify-center rounded-full bg-warning-soft text-warning-text"
      >
        <CalendarSearch size={20} />
      </span>
      <p className="text-body font-medium text-text-primary">{translate(filtered ? 'empty.title' : 'empty.period')}</p>
      {filtered && (
        <>
          <p className="max-w-sm text-caption text-text-secondary">{translate('empty.text')}</p>
          <Button variant="secondary" onClick={() => void setUrl(fromFilter({}))}>
            {translate('filters.reset')}
          </Button>
        </>
      )}
    </div>
  )
}

function CalendarBody() {
  const translate = useTranslations('calendar')
  const { view } = useCalendarParams()
  const { entries, totals } = useCalendarData()

  if (entries.isPending || totals.isPending) {
    return <div aria-busy className="h-96 rounded-card bg-subtle" />
  }

  if (entries.isError || totals.isError) {
    return (
      <p role="alert" className="text-body text-negative-text">
        {translate('loadFailed')}
      </p>
    )
  }

  if (view === 'day') {
    return <DayPanel />
  }

  if (view === 'list' && entries.data.length === 0) {
    return <EmptyPeriod />
  }

  if (view !== 'month') {
    return <CalendarDays />
  }

  return (
    <div className="grid gap-4 lg:grid-cols-4 lg:items-start lg:gap-6">
      <div className="lg:col-span-3">
        <CalendarMonth />
      </div>
      <DayPanel />
    </div>
  )
}

// Figma «Saldo» → Calendar 2:66941: toolbar, quick sets, period totals, then the month grid with the day panel (desktop
// side by side, mobile one under the other), the week / list card or the day. Everything the screen shows is in the URL.
export function CalendarScreen() {
  return (
    <div className="flex flex-col gap-4 lg:gap-6">
      <CalendarToolbar />
      <CalendarSets />
      <CalendarSummary />
      <CalendarBody />
    </div>
  )
}
