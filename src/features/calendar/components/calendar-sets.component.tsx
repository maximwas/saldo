'use client'

import { Bookmark, Check, SlidersHorizontal, X } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { useState } from 'react'
import { Button } from '@/components/ui/button.component'
import { useLedger } from '@/contexts/ledger.context'
import { formatMinor } from '@/lib/money/money.utils'
import { cn } from '@/lib/utils/cn.utils'
import { useCalendarOptions, useSavedFilters } from '../hooks/calendar.hook'
import { useCalendarParams } from '../hooks/calendar-params.hook'
import {
  activeChips,
  activeQuickSet,
  fromFilter,
  QUICK_SETS,
  sameFilter,
  typeKeysOf,
  type UrlFilter,
} from '../utils/calendar-filters.utils'
import { CalendarFilterSheet } from './calendar-filter-sheet.component'

type ChipProps = {
  pressed: boolean
  onClick: () => void
  children: React.ReactNode
}

// Figma «Saldo» → Calendar 2:66942 chips: the active one primary-soft with a check, the rest outlined on white
function Chip({ pressed, onClick, children }: ChipProps) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={cn(
        'inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3 text-label font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary',
        pressed
          ? 'bg-primary-soft text-primary-text'
          : 'border border-border-strong bg-card text-text-primary hover:bg-subtle',
      )}
    >
      {pressed && <Check aria-hidden size={16} />}
      {children}
    </button>
  )
}

const asList = (value: unknown) => (Array.isArray(value) ? value : [value]).map(String)

/** «Category: Products», «Search: «Megogo»» — what an active filter chip says */
function useChipLabel() {
  const translate = useTranslations('calendar')
  const locale = useLocale()
  const { baseCurrency } = useLedger()
  const { filter } = useCalendarParams()
  const options = useCalendarOptions().data
  const nameOf =
    (
      list:
        | {
            id: string
            name: string
          }[]
        | undefined,
    ) =>
    (id: string) =>
      list?.find((row) => row.id === id)?.name ?? '…'
  const money = (values: string[]) => formatMinor(Number(values[0]), baseCurrency, locale)
  const text: Partial<Record<keyof UrlFilter, (values: string[]) => string[]>> = {
    entry: (values) => values.map((value) => translate(`entryType.${value as 'fact'}`)),
    kinds: (values) => values.map((value) => translate(`kind.${value as 'expense'}`)),
    direction: (values) => values.map((value) => translate(`direction.${value as 'in'}`)),
    states: (values) => values.map((value) => translate(`state.${value as 'plan'}`)),
    source_types: (values) => values.map((value) => translate(`source.${value as 'manual'}`)),
    category_ids: (values) => values.map(nameOf(options?.categories)),
    account_ids: (values) => values.map(nameOf(options?.accounts)),
    min_amount_minor: (values) => [money(values)],
    max_amount_minor: (values) => [money(values)],
    q: (values) => [`«${values[0]}»`],
  }

  return (key: keyof UrlFilter) => {
    const values = asList(filter[key])
    const shown = text[key]?.(values) ?? values

    return `${translate(`filters.${key}`)}: ${shown.join(', ')}`
  }
}

// Figma «Saldo» → Calendar 2:66942 / 2:77407: quick sets (§18) and the space's own sets as chips, «Reset filters» and
// «Filters» on the right; the active refinements (no frame) as removable chips under them
export function CalendarSets() {
  const translate = useTranslations('calendar')
  const { filter, setUrl } = useCalendarParams()
  const saved = useSavedFilters()
  const chipLabel = useChipLabel()
  const [sheetOpen, setSheetOpen] = useState(false)
  const quickSet = activeQuickSet(filter)
  const chips = activeChips(filter)

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <fieldset className="-mx-5 flex min-w-0 gap-2 overflow-x-auto px-5 lg:mx-0 lg:flex-wrap lg:overflow-visible lg:px-0">
          <legend className="sr-only">{translate('sets.label')}</legend>
          {QUICK_SETS.map((set) => (
            <Chip key={set.key} pressed={quickSet === set.key} onClick={() => void setUrl(typeKeysOf(set.filter))}>
              {translate(`sets.${set.key}`)}
            </Chip>
          ))}
          {saved.data?.map((set) => (
            <Chip
              key={set.id}
              pressed={sameFilter(filter, set.filter)}
              onClick={() => void setUrl(fromFilter(set.filter))}
            >
              <Bookmark aria-hidden size={16} />
              {set.name}
            </Chip>
          ))}
        </fieldset>
        <div className="flex gap-2 lg:ml-auto">
          {Object.keys(filter).length > 0 && (
            <Button variant="secondary" size="s" onClick={() => void setUrl(fromFilter({}))}>
              {translate('filters.reset')}
            </Button>
          )}
          <Button variant="secondary" size="s" onClick={() => setSheetOpen(true)}>
            <SlidersHorizontal aria-hidden size={16} />
            {translate('filters.open')}
          </Button>
        </div>
      </div>
      {chips.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {chips.map((key) => (
            <li key={key}>
              <button
                type="button"
                aria-label={translate('filters.remove', { label: chipLabel(key) })}
                onClick={() => void setUrl({ [key]: null })}
                className="inline-flex h-8 items-center gap-1 rounded-full bg-subtle px-3 text-caption text-text-primary outline-none hover:bg-border focus-visible:ring-2 focus-visible:ring-primary"
              >
                {chipLabel(key)}
                <X aria-hidden size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
      <CalendarFilterSheet open={sheetOpen} onOpenChangeAction={setSheetOpen} />
    </div>
  )
}
