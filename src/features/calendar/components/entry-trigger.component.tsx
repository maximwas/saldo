'use client'

import { Popover } from '@base-ui/react/popover'
import { useId } from 'react'
import { useRipple } from '@/components/ui/ripple.hook'
import { cn } from '@/lib/utils/cn.utils'
import { useIsSheetDialog } from '@/lib/utils/media-query.hook'
import type { CalendarEntry } from '../api/calendar.api'
import { useCalendarParams } from '../hooks/calendar-params.hook'

/** the calendar's one entry popup: every entry on the screen is a detached trigger of it (Base UI handle), so the
 * popup opens next to the very line that was clicked, whichever place shows the entry */
export const entryPopup = Popover.createHandle<string>()

type EntryTriggerProps = {
  entry: CalendarEntry
  /** the layout of the line or the row */
  className: string
  children: React.ReactNode
}

const TRIGGER_CLASS =
  'relative cursor-pointer overflow-hidden text-left outline-none transition-colors hover:bg-subtle focus-visible:ring-2 focus-visible:ring-primary'

/** an entry that opens its popup: anchored to it on desktop, a bottom sheet on phones; ?item= keeps it across a reload */
export function EntryTrigger({ entry, className, children }: EntryTriggerProps) {
  const id = useId()
  const desktop = useIsSheetDialog()
  const { setUrl } = useCalendarParams()
  const { pressProps, ripple } = useRipple()
  const props = {
    id,
    type: 'button' as const,
    'data-entry': entry.id,
    className: cn(TRIGGER_CLASS, className),
    onClick: () => void setUrl({ item: entry.id }),
    ...pressProps,
  }

  if (desktop) {
    return (
      <Popover.Trigger handle={entryPopup} payload={entry.id} {...props}>
        {children}
        {ripple}
      </Popover.Trigger>
    )
  }

  return (
    <button {...props}>
      {children}
      {ripple}
    </button>
  )
}
