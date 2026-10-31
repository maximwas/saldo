import { Popover } from '@base-ui/react/popover'
import { format, parse } from 'date-fns'
import { Calendar } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { useState } from 'react'
import { DayPicker } from 'react-day-picker'
import { enUS, uk } from 'react-day-picker/locale'
import { useClock } from '@/contexts/clock.context'
import { localDate } from '@/lib/utils/clock.utils'
import { cn } from '@/lib/utils/cn.utils'
import { Button } from './button.component'
import type { FieldControlProps } from './field.component'

const DATE_FORMAT = 'yyyy-MM-dd'

type DatePickerProps = FieldControlProps & {
  /** local calendar date as YYYY-MM-DD; null while empty */
  value: string | null
  onValueChange: (value: string | null) => void
  /** shows «Clear» in the footer; leave off for a required date */
  clearable?: boolean
  disabled?: boolean
  name?: string
  onBlur?: () => void
  className?: string
}

const toDate = (value: string) => parse(value, DATE_FORMAT, new Date())

// Figma «Saldo» → DateField 2:9485 (trigger: 48 high, padding 0/16, calendar icon 20, dd.mm.yyyy) and DatePicker
// 2:9482 (popover 312 wide, radius card, shadow-float, padding 16; day cells 40, selected = primary fill, today =
// 1px primary ring; footer «Clear» ghost + «Today» secondary, both size S). Weeks start on Monday.
export function DatePicker({
  value,
  onValueChange,
  clearable = false,
  disabled,
  name,
  onBlur,
  className,
  id,
  'aria-describedby': describedBy,
  'aria-invalid': invalid,
}: DatePickerProps) {
  const locale = useLocale()
  const translate = useTranslations('common')
  const clock = useClock()
  const [open, setOpen] = useState(false)
  const todayValue = localDate(clock.now(), clock.timeZone)
  const selected = value ? toDate(value) : undefined
  const display = selected
    ? new Intl.DateTimeFormat(locale, {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }).format(selected)
    : null

  const commit = (next: string | null) => {
    onValueChange(next)
    setOpen(false)
  }

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger
        id={id}
        disabled={disabled}
        aria-describedby={describedBy}
        aria-invalid={invalid}
        onBlur={onBlur}
        className={cn(
          'flex h-12 w-full items-center gap-2 rounded-md border border-border-strong bg-card px-4 text-left text-body outline-none transition-colors focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary data-popup-open:border-primary data-popup-open:ring-1 data-popup-open:ring-primary aria-invalid:border-negative aria-invalid:focus-visible:ring-negative disabled:cursor-not-allowed disabled:bg-subtle disabled:text-text-tertiary',
          display ? 'text-text-primary' : 'text-text-tertiary',
          className,
        )}
      >
        <span className="flex-1">{display ?? translate('datePicker.placeholder')}</span>
        <Calendar className="size-5 shrink-0 text-text-secondary" aria-hidden />
      </Popover.Trigger>
      {name ? <input type="hidden" name={name} value={value ?? ''} /> : null}
      <Popover.Portal>
        <Popover.Positioner sideOffset={4} align="start" className="z-50">
          <Popover.Popup className="flex w-78 origin-(--transform-origin) flex-col gap-3 rounded-card bg-raised p-4 shadow-float outline-none transition-opacity data-ending-style:opacity-0 data-starting-style:opacity-0">
            <DayPicker
              mode="single"
              autoFocus
              showOutsideDays
              weekStartsOn={1}
              locale={locale === 'uk' ? uk : enUS}
              today={toDate(todayValue)}
              defaultMonth={selected ?? toDate(todayValue)}
              selected={selected}
              onSelect={(date) => {
                if (date) {
                  commit(format(date, DATE_FORMAT))
                }
              }}
              labels={{
                labelPrevious: () => translate('datePicker.previousMonth'),
                labelNext: () => translate('datePicker.nextMonth'),
              }}
              classNames={{
                root: 'relative',
                months: 'flex flex-col',
                month: 'flex flex-col gap-3',
                month_caption: 'flex h-9 items-center justify-center',
                caption_label: 'text-label font-semibold text-text-primary capitalize',
                nav: 'absolute inset-x-0 top-0 flex h-9 items-center justify-between',
                button_previous:
                  'flex size-9 cursor-pointer items-center justify-center rounded-md text-text-secondary outline-none transition-colors hover:bg-subtle focus-visible:ring-2 focus-visible:ring-primary',
                button_next:
                  'flex size-9 cursor-pointer items-center justify-center rounded-md text-text-secondary outline-none transition-colors hover:bg-subtle focus-visible:ring-2 focus-visible:ring-primary',
                chevron: 'size-5 fill-current',
                month_grid: 'border-separate border-spacing-y-0.5',
                weekday: 'size-10 text-center text-micro font-medium text-text-tertiary capitalize',
                day: 'group p-0 text-center',
                day_button:
                  'flex size-10 cursor-pointer items-center justify-center rounded-full border border-transparent text-label text-text-primary outline-none transition-colors hover:bg-subtle focus-visible:ring-2 focus-visible:ring-primary group-data-outside:text-text-tertiary group-data-today:border-primary group-data-today:font-semibold group-data-today:text-primary-text group-data-selected:border-primary group-data-selected:bg-primary group-data-selected:font-semibold group-data-selected:text-on-primary',
              }}
            />
            <div
              className={cn(
                'flex items-center border-t border-border pt-2',
                clearable ? 'justify-between' : 'justify-end',
              )}
            >
              {clearable ? (
                <Button type="button" variant="ghost" size="s" onClick={() => commit(null)}>
                  {translate('datePicker.clear')}
                </Button>
              ) : null}
              <Button type="button" variant="secondary" size="s" onClick={() => commit(todayValue)}>
                {translate('datePicker.today')}
              </Button>
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  )
}
