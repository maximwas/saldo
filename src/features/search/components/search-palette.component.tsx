'use client'

import { Autocomplete } from '@base-ui/react/autocomplete'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Search } from 'lucide-react'
import type { Route } from 'next'
import { useRouter } from 'next/navigation'
import { useFormatter, useTranslations } from 'next-intl'
import { useDeferredValue, useEffect, useRef, useState } from 'react'
import { Amount } from '@/components/ui/amount.component'
import { Input } from '@/components/ui/input.component'
import { Sheet } from '@/components/ui/sheet.component'
import { useLedgerStore } from '@/contexts/ledger.context'
import type { SearchResult } from '../api/search.api'
import { searchQueries } from '../api/search.queries'

type EntityType = 'account' | 'category' | 'subscription' | 'credit' | 'debt' | 'obligation' | 'operation'

type Group = {
  value: EntityType
  items: SearchResult[]
}

// search_entities starts at two characters
const MIN_QUERY = 2
// for categories and subscriptions the subtitle is a code (kind, status): the group label already says it
const TEXT_SUBTITLES = new Set(['credit', 'debt', 'operation'])
// an operation with no counterparty and no note is titled by its kind code
const KIND_KEY = {
  income: 'income',
  expense: 'expense',
  refund: 'refund',
  adjustment: 'adjustment',
  transfer_out: 'transfer',
  debt_out: 'debt',
  debt_in: 'debt',
} as const

const TRIGGER_CLASS =
  'cursor-pointer items-center rounded-md border border-border bg-card text-text-tertiary outline-none focus-visible:ring-2 focus-visible:ring-primary'

// Plan 7.5: the Topbar search field (desktop) and ⌘K / Ctrl+K anywhere open one search over the active space; the
// mobile Topbar (Figma 2:8195 Platform=Mobile) has no search, only the space switcher and the bell. No Figma frame for
// the palette: the house Sheet with an inline Base UI Autocomplete (its command palette pattern), results grouped by
// type in search_entities order, arrows + Enter or a click open the item's link.
export function SearchPalette() {
  const translate = useTranslations('shell')
  const [open, setOpen] = useState(false)
  // typing starts in the search field, not on the sheet's close button
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const toggle = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setOpen((current) => !current)
      }
    }

    window.addEventListener('keydown', toggle)

    return () => window.removeEventListener('keydown', toggle)
  }, [])

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`${TRIGGER_CLASS} hidden h-11 w-70 gap-2 px-3 text-body lg:mr-1 lg:flex`}
      >
        <Search aria-hidden size={20} className="shrink-0" />
        <span className="flex-1 truncate text-left">{translate('search')}</span>
      </button>
      <Sheet open={open} onOpenChange={setOpen} title={translate('searchPalette.title')} initialFocus={inputRef}>
        {open ? <SearchResults inputRef={inputRef} onPickAction={() => setOpen(false)} /> : null}
      </Sheet>
    </>
  )
}

type SearchResultsProps = {
  inputRef: React.RefObject<HTMLInputElement | null>
  onPickAction: () => void
}

function SearchResults({ inputRef, onPickAction }: SearchResultsProps) {
  const translate = useTranslations('shell.searchPalette')
  const router = useRouter()
  const ledgerId = useLedgerStore((ledger) => ledger.ledgerId)
  const [query, setQuery] = useState('')
  // shortcut: one search per settled keystroke (useDeferredValue, no debounce); add a debounce if search gets slow
  const term = useDeferredValue(query.trim())
  const ready = term.length >= MIN_QUERY
  const search = useQuery({
    ...searchQueries.entities(ledgerId, term),
    enabled: ready,
    placeholderData: keepPreviousData,
  })
  const results = ready ? (search.data ?? []) : []
  const groups = Object.entries(Object.groupBy(results, (row) => row.entity_type)).map(
    ([value, items]) =>
      ({
        value,
        items,
      }) as Group,
  )
  let status: 'hint' | 'failed' | 'searching' | 'empty' | null = null

  if (!ready) {
    status = 'hint'
  } else if (search.isError) {
    status = 'failed'
  } else if (search.isPending) {
    status = 'searching'
  } else if (results.length === 0) {
    status = 'empty'
  }

  const pick = (row: SearchResult) => {
    onPickAction()
    router.push(row.link_path as Route)
  }

  return (
    <Autocomplete.Root
      open
      inline
      items={groups}
      value={query}
      onValueChange={setQuery}
      filter={null}
      autoHighlight
      itemToStringValue={(row: SearchResult) => row.title}
    >
      <Autocomplete.Input
        ref={inputRef}
        aria-label={translate('title')}
        placeholder={translate('placeholder')}
        render={<Input />}
      />
      <div className="flex h-80 flex-col overflow-y-auto">
        <Autocomplete.Status className="px-1 py-2 text-caption text-text-secondary empty:hidden">
          {status ? translate(status) : null}
        </Autocomplete.Status>
        <Autocomplete.List className="flex flex-col gap-3">
          {(group: Group) => (
            <Autocomplete.Group key={group.value} items={group.items} className="flex flex-col gap-1">
              <Autocomplete.GroupLabel className="px-1 pt-1 text-caption text-text-tertiary">
                {translate(`groups.${group.value}`)}
              </Autocomplete.GroupLabel>
              <Autocomplete.Collection>
                {(row: SearchResult) => <ResultItem key={row.entity_id} row={row} onPickAction={pick} />}
              </Autocomplete.Collection>
            </Autocomplete.Group>
          )}
        </Autocomplete.List>
      </div>
    </Autocomplete.Root>
  )
}

type ResultItemProps = {
  row: SearchResult
  onPickAction: (row: SearchResult) => void
}

function ResultItem({ row, onPickAction }: ResultItemProps) {
  const translateOperations = useTranslations('operations')
  const format = useFormatter()
  const kind = row.entity_type === 'operation' ? KIND_KEY[row.title as keyof typeof KIND_KEY] : undefined
  const title = kind ? translateOperations(`kinds.${kind}`) : row.title
  const details = [
    TEXT_SUBTITLES.has(row.entity_type) ? row.subtitle : null,
    row.day
      ? format.dateTime(new Date(`${row.day}T12:00:00Z`), {
          timeZone: 'UTC',
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })
      : null,
  ].filter(Boolean)

  return (
    <Autocomplete.Item
      value={row}
      onClick={() => onPickAction(row)}
      className="flex cursor-pointer items-center justify-between gap-3 rounded-inner px-3 py-2 outline-none select-none data-highlighted:bg-subtle"
    >
      <span className="flex min-w-0 flex-col">
        <span className="truncate text-body text-text-primary">{title}</span>
        {details.length > 0 ? (
          <span className="truncate text-caption text-text-secondary">{details.join(' · ')}</span>
        ) : null}
      </span>
      {row.amount_minor !== null && row.currency ? (
        <Amount minor={row.amount_minor} currency={row.currency} className="shrink-0 text-body" />
      ) : null}
    </Autocomplete.Item>
  )
}
