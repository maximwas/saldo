'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useFormatter, useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button.component'
import { SegmentedControl } from '@/components/ui/segmented-control.component'
import { useCalendarParams } from '../hooks/calendar-params.hook'
import { CALENDAR_VIEWS, capitalize, dayDate, periodRange, shiftDay } from '../utils/calendar.utils'

function usePeriodTitle() {
  const format = useFormatter()
  const { view, date } = useCalendarParams()
  const anchor = dayDate(date)

  if (view === 'week') {
    const { from, to } = periodRange('week', date)

    return format.dateTimeRange(dayDate(from), dayDate(to), {
      timeZone: 'UTC',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  if (view === 'day') {
    return capitalize(
      format.dateTime(anchor, {
        timeZone: 'UTC',
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      }),
    )
  }

  const month = format.dateTime(anchor, {
    timeZone: 'UTC',
    month: 'long',
  })

  return `${capitalize(month)} ${date.slice(0, 4)}`
}

// Figma «Saldo» → Calendar 2:66942 / 2:69624: arrows, the period, «Today» and the Month / Week / Day / List switch
// (full width on mobile); the arrows step by the unit of the view
export function CalendarToolbar() {
  const translate = useTranslations('calendar')
  const { view, date, setUrl } = useCalendarParams()
  const title = usePeriodTitle()
  const step = (direction: 1 | -1) =>
    void setUrl({
      date: shiftDay(view, date, direction),
      item: null,
    })

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          size="s"
          className="w-9 px-0"
          aria-label={translate('previous')}
          onClick={() => step(-1)}
        >
          <ChevronLeft aria-hidden size={20} />
        </Button>
        <Button
          variant="secondary"
          size="s"
          className="w-9 px-0"
          aria-label={translate('next')}
          onClick={() => step(1)}
        >
          <ChevronRight aria-hidden size={20} />
        </Button>
        <h2 className="min-w-0 flex-1 truncate text-card-title text-text-primary lg:flex-none">{title}</h2>
        <Button
          variant="secondary"
          size="s"
          onClick={() =>
            void setUrl({
              date: null,
              item: null,
            })
          }
        >
          {translate('today')}
        </Button>
      </div>
      <SegmentedControl
        label={translate('views.label')}
        options={CALENDAR_VIEWS.map((value) => ({
          value,
          label: translate(`views.${value}`),
        }))}
        value={view}
        onValueChange={(next) =>
          void setUrl({
            view: next === 'month' ? null : next,
            item: null,
          })
        }
        stretch
      />
    </div>
  )
}
