'use client'

import { useQuery } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { parseAsString, useQueryState } from 'nuqs'
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { Button } from '@/components/ui/button.component'
import { Bone, SkeletonCard, SkeletonLine } from '@/components/ui/skeleton.component'
import { useLedgerStore } from '@/contexts/ledger.context'
import { mergeQueued } from '@/lib/query/sync-queue.utils'
import { operationQueries } from '../api/operations.queries'
import { useOperationFilters } from '../hooks/operation-filters.hook'
import { useQueuedOperations } from '../hooks/queued-operations.hook'
import type { OperationItem } from '../operations.types'
import { buildItems, newestFirst, summarize } from '../utils/operation-items.utils'
import { type EditorTarget, OperationEditor } from './operation-editor.component'
import { OperationFilters } from './operation-filters.component'
import { OperationList } from './operation-list.component'
import { OperationSummary } from './operation-summary.component'

const subscribeNever = () => () => undefined

// Figma Saldo file → Operations 2:11403 / 2:13681: type switch and chips, the totals of the filter, then the list by day.
// Adding goes through the global «Add» (?add=), here only a row opens the sheet (edit / view) or a duplicate of it.
export function OperationsScreen() {
  const translate = useTranslations('operations')
  const ledgerId = useLedgerStore((ledger) => ledger.ledgerId)
  const { url, filters, period, today, active, setUrl, reset } = useOperationFilters()
  const list = useQuery(operationQueries.list(ledgerId, filters))
  const timeZone = useLedgerStore((ledger) => ledger.timeZone)
  const baseCurrency = useLedgerStore((ledger) => ledger.baseCurrency)
  // the «with plan to the month end» line belongs to the whole current month: a type, account or category filter hides it
  const wholeMonth = period === today.slice(0, 7) && url.type === 'all' && !url.account && !url.category && !url.who
  const planned = useQuery({
    ...operationQueries.planned(
      {
        ledgerId,
        baseCurrency,
        timeZone,
      },
      today,
    ),
    enabled: wholeMonth,
  })
  const upcoming = useQuery({
    ...operationQueries.upcoming(ledgerId, today),
    enabled: wholeMonth,
  })
  const options = useQuery(operationQueries.options(ledgerId))
  // the screen is a streamed Suspense boundary: it hydrates after the device cache is restored, so the first client
  // render repeats the server's skeleton and the data comes one render later (no hydration mismatch)
  const hydrated = useSyncExternalStore(
    subscribeNever,
    () => true,
    () => false,
  )
  // `key` changes with every target, so a row, then its duplicate, each get a fresh form and fresh ids
  const [editor, setEditor] = useState<{
    open: boolean
    target: EditorTarget
    key: number
  } | null>(null)
  const queued = useQueuedOperations()
  // a create still in the device's queue shows as a row with its state until the server has it (one row per id)
  const items = useMemo(
    () =>
      list.data ? buildItems(mergeQueued(list.data.rows, queued.rows).sort(newestFirst), list.data.transfers) : [],
    [list.data, queued.rows],
  )
  const receiptIds = useMemo(() => new Set(list.data?.receiptIds ?? []), [list.data])
  const totals = useMemo(() => summarize(items), [items])
  const [linkedId, setLinkedId] = useQueryState('operation', parseAsString.withOptions({ history: 'replace' }))
  const linked = linkedId ? items.find((item) => item.row.id === linkedId) : undefined

  // a search result links ?period=<month>&operation=<id>: open its sheet (edit, or view for a viewer), then drop the id
  useEffect(() => {
    if (!linked) {
      return
    }

    setEditor((current) => ({
      open: true,
      target: {
        mode: 'edit',
        item: linked,
      },
      key: (current?.key ?? 0) + 1,
    }))
    void setLinkedId(null)
  }, [linked, setLinkedId])

  const openEditor = (target: EditorTarget) =>
    setEditor((current) => ({
      open: true,
      target,
      key: (current?.key ?? 0) + 1,
    }))
  const select = (item: OperationItem) =>
    openEditor({
      mode: 'edit',
      item,
    })

  let content: React.ReactNode

  if (!hydrated || list.isPending || options.isPending) {
    content = (
      // Figma operations loading frame 5:103704 (mobile; desktop has no frame and takes the same): the totals card
      // (padding 16, gap 12, two 56 bars) and day cards (padding 16, gap 16, a 140×14 title, lines with a 72 end bar)
      <div aria-busy className="flex flex-col gap-4">
        <SkeletonCard className="flex-row gap-3 p-4">
          <Bone className="h-14 flex-1 rounded-md" />
          <Bone className="h-14 flex-1 rounded-md" />
        </SkeletonCard>
        <SkeletonCard className="gap-4 p-4">
          <Bone className="h-3.5 w-35 rounded-sm" />
          <SkeletonLine end="w-18" />
          <SkeletonLine end="w-18" />
        </SkeletonCard>
        <SkeletonCard className="gap-4 p-4">
          <Bone className="h-3.5 w-35 rounded-sm" />
          <SkeletonLine end="w-18" />
        </SkeletonCard>
      </div>
    )
  } else if (list.isError || options.isError) {
    content = (
      <p role="alert" className="text-body text-negative-text">
        {translate('loadFailed')}
      </p>
    )
  } else if (items.length === 0) {
    content = (
      <div className="flex flex-col items-center gap-3 rounded-card bg-card px-5 py-12 text-center shadow-card">
        <p className="text-card-title text-text-primary">{translate(active ? 'empty.filtered' : 'empty.title')}</p>
        {active ? (
          <Button variant="secondary" onClick={reset}>
            {translate('filters.reset')}
          </Button>
        ) : (
          <p className="text-body text-text-secondary">{translate('empty.hint')}</p>
        )}
      </div>
    )
  } else {
    content = (
      <>
        <OperationSummary
          totals={totals}
          period={period}
          withPlanMinor={wholeMonth && planned.data != null ? totals.resultMinor - planned.data : null}
        />
        {list.data.truncated ? (
          <p className="text-caption text-text-tertiary">{translate('truncated', { count: list.data.rows.length })}</p>
        ) : null}
        <OperationList
          items={items}
          receiptIds={receiptIds}
          syncStates={queued.states}
          planned={wholeMonth ? upcoming.data : undefined}
          onSelectAction={select}
        />
      </>
    )
  }

  return (
    <div className="flex flex-col gap-4 lg:gap-6">
      <OperationFilters
        period={period}
        accountId={url.account}
        categoryId={url.category}
        createdBy={url.who}
        type={url.type}
        onChangeAction={(change) => void setUrl(change)}
      />
      {content}
      {editor ? (
        <OperationEditor
          key={editor.key}
          open={editor.open}
          target={editor.target}
          onOpenChangeAction={(open) =>
            setEditor((current) =>
              current
                ? {
                    ...current,
                    open,
                  }
                : current,
            )
          }
          onOpenAction={select}
          onDuplicateAction={({ occurredOn: _date, occurredTime: _time, ...defaults }, sourceId) =>
            openEditor({
              mode: 'create',
              kind: defaults.kind === 'income' ? 'income' : 'expense',
              defaults,
              duplicatedFromId: sourceId,
            })
          }
        />
      ) : null}
    </div>
  )
}
