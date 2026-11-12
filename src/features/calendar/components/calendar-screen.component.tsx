'use client'

import { CalendarSearch } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Banner } from '@/components/ui/banner.component'
import { Button } from '@/components/ui/button.component'
import { EmptyState } from '@/components/ui/empty-state.component'
import { ErrorState } from '@/components/ui/error-state.component'
import { Bone, SkeletonCard } from '@/components/ui/skeleton.component'
import { useCanWrite } from '@/contexts/ledger.context'
import { useScreenQueryState } from '@/lib/query/screen-query-state.hook'
import { useHydrated } from '@/lib/utils/hydrated.hook'
import { useCalendarData } from '../hooks/calendar.hook'
import { useCalendarParams } from '../hooks/calendar-params.hook'
import { activeQuickSet, fromFilter } from '../utils/calendar-filters.utils'
import { CalendarDays } from './calendar-days.component'
import { CalendarMonth } from './calendar-month.component'
import { CalendarSets } from './calendar-sets.component'
import { CalendarSummary } from './calendar-summary.component'
import { CalendarToolbar } from './calendar-toolbar.component'
import { DayPanel } from './day-panel.component'
import { EntryPopup } from './entry-popup.component'

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
    <EmptyState
      icon={CalendarSearch}
      tone="yellow"
      title={title}
      hint={filtered && translate('empty.text')}
      action={
        filtered && (
          <Button variant="secondary" onClick={() => void setUrl(fromFilter({}))}>
            {translate('filters.reset')}
          </Button>
        )
      }
    />
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
  const { failedLoad, retry } = useScreenQueryState([entries, totals], translate('refreshFailed'))
  const hydrated = useHydrated()

  if (failedLoad) {
    return <ErrorState title={translate('loadFailed')} onRetryAction={retry} />
  }

  if (!hydrated || entries.data === undefined || totals.data === undefined) {
    return <GridSkeleton />
  }

  if (view === 'day') {
    return <DayPanel />
  }

  if (view === 'list') {
    return entries.data.length === 0 ? <EmptyPeriod /> : <CalendarDays />
  }

  // Figma 59:128610: the desktop week is seven tiles across the content and a click opens the day; phones keep the
  // selected day's card under the row
  if (view === 'week') {
    return (
      <div className="flex flex-col gap-4">
        <CalendarMonth />
        <div className="lg:hidden">
          <DayPanel />
        </div>
      </div>
    )
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_20rem] lg:items-stretch lg:gap-6">
      <CalendarMonth />
      <DayPanel compact />
    </div>
  )
}

// Figma «Saldo» → Calendar 51:125110: the view-only banner, toolbar, quick sets, period totals, then the month (or the
// week) grid with the day panel (desktop side by side, 800 / 320 and a gap of 24; phones one under the other), the list
// card or the day. Gaps 20 on desktop, 16 on phones. Everything the screen shows is in the URL, the open entry too.
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
      <EntryPopup />
    </div>
  )
}
