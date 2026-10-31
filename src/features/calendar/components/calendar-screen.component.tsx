'use client'

import { CalendarSearch } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Banner } from '@/components/ui/banner.component'
import { Button } from '@/components/ui/button.component'
import { Bone, SkeletonCard } from '@/components/ui/skeleton.component'
import { useCanWrite } from '@/contexts/ledger.context'
import { useCalendarData } from '../hooks/calendar.hook'
import { useCalendarParams } from '../hooks/calendar-params.hook'
import { activeQuickSet, fromFilter } from '../utils/calendar-filters.utils'
import { CalendarDays } from './calendar-days.component'
import { CalendarMonth } from './calendar-month.component'
import { CalendarSets } from './calendar-sets.component'
import { CalendarSummary } from './calendar-summary.component'
import { CalendarToolbar } from './calendar-toolbar.component'
import { DayPanel } from './day-panel.component'

// Figma «Saldo» → Calendar · Empty by filter 2:77407 (Empty 2:77692: padding 64 / 24, EmptyState 420 wide): a 40 icon
// circle, «Nothing matches «Taxes»», a line and «Reset filters»
function EmptyPeriod() {
  const translate = useTranslations('calendar')
  const { filter, setUrl } = useCalendarParams()
  const filtered = Object.keys(filter).length > 0
  const set = activeQuickSet(filter)
  let title = translate('empty.period')

  if (filtered) {
    title = set ? translate('empty.titleNamed', { name: translate(`sets.${set}`) }) : translate('empty.title')
  }

  return (
    <div className="flex flex-col items-center rounded-card bg-card px-6 py-16 shadow-card">
      <div className="flex w-full max-w-105 flex-col items-center gap-3 p-2 text-center">
        <span
          aria-hidden
          className="flex size-10 items-center justify-center rounded-full bg-cat-yellow-soft text-cat-yellow-text"
        >
          <CalendarSearch size={20} />
        </span>
        <p className="self-stretch text-body font-semibold text-text-primary">{title}</p>
        {filtered && (
          <>
            <p className="self-stretch text-label text-text-secondary">{translate('empty.text')}</p>
            <Button variant="secondary" onClick={() => void setUrl(fromFilter({}))}>
              {translate('filters.reset')}
            </Button>
          </>
        )}
      </div>
    </div>
  )
}

// Figma «Saldo» → Loading 2:79427: a card of five subtle rows (36 high, radius sm) where the grid will be
function GridSkeleton() {
  return (
    <SkeletonCard aria-busy className="gap-3 p-4">
      {[0, 1, 2, 3, 4].map((row) => (
        <Bone key={row} className="h-9 rounded-sm" />
      ))}
    </SkeletonCard>
  )
}

function CalendarBody() {
  const translate = useTranslations('calendar')
  const { view } = useCalendarParams()
  const { entries, totals } = useCalendarData()

  if (entries.isPending || totals.isPending) {
    return <GridSkeleton />
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
    <div className="grid gap-4 lg:grid-cols-[1fr_20rem] lg:items-stretch lg:gap-6">
      <CalendarMonth />
      <DayPanel compact />
    </div>
  )
}

// Figma «Saldo» → Calendar 2:66941: the view-only banner, toolbar, quick sets, period totals, then the month grid with
// the day panel (desktop side by side, 800 / 320 and a gap of 24; phones one under the other), the week / list card or
// the day. Gaps 20 on desktop, 16 on phones. Everything the screen shows is in the URL.
export function CalendarScreen() {
  const translate = useTranslations('calendar')
  const canWrite = useCanWrite()

  return (
    <div className="flex flex-col gap-4 lg:gap-5">
      {canWrite ? null : <Banner>{translate('viewOnly')}</Banner>}
      <CalendarToolbar />
      <CalendarSets />
      <CalendarSummary />
      <CalendarBody />
    </div>
  )
}
