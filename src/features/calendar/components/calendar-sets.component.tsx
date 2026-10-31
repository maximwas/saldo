'use client'

import { X } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { useState } from 'react'
import { Button } from '@/components/ui/button.component'
import { Chip } from '@/components/ui/chip.component'
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

// Figma «Saldo» → Calendar 2:66942 / 2:77407 / 2:69624: quick sets (§18) and the space's own sets as Chip 2:7714 (the
// active one primary-soft with a check), gap 8, wrapping; «Filters» is a 36 Button at the end on desktop and the last,
// chip-shaped one on phones. With a filter on, «Reset filters» stands before it. The active refinements (no frame) are
// removable chips under them.
export function CalendarSets() {
  const translate = useTranslations('calendar')
  const { filter, setUrl } = useCalendarParams()
  const saved = useSavedFilters()
  const chipLabel = useChipLabel()
  const [sheetOpen, setSheetOpen] = useState(false)
  const quickSet = activeQuickSet(filter)
  const chips = activeChips(filter)
  const filtered = Object.keys(filter).length > 0

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <fieldset className="contents">
          <legend className="sr-only">{translate('sets.label')}</legend>
          {QUICK_SETS.map((set) => (
            <Chip key={set.key} selected={quickSet === set.key} onClick={() => void setUrl(typeKeysOf(set.filter))}>
              {translate(`sets.${set.key}`)}
            </Chip>
          ))}
          {saved.data?.map((set) => (
            <Chip
              key={set.id}
              selected={sameFilter(filter, set.filter)}
              onClick={() => void setUrl(fromFilter(set.filter))}
            >
              {set.name}
            </Chip>
          ))}
        </fieldset>
        {filtered && (
          <Button
            variant="secondary"
            size="s"
            className="rounded-full lg:ml-auto lg:rounded-md"
            onClick={() => void setUrl(fromFilter({}))}
          >
            {translate('filters.reset')}
          </Button>
        )}
        <Button
          variant="secondary"
          size="s"
          className={cn('h-9.5 rounded-full lg:h-9 lg:rounded-md', !filtered && 'lg:ml-auto')}
          onClick={() => setSheetOpen(true)}
        >
          {translate('filters.open')}
        </Button>
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
