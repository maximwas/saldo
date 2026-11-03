'use client'

import { Popover } from '@base-ui/react/popover'
import { useQuery } from '@tanstack/react-query'
import { RefreshCw } from 'lucide-react'
import { useFormatter, useTranslations } from 'next-intl'
import { useState } from 'react'
import { SyncStatus } from '@/components/layout/sync-status.component'
import { Amount } from '@/components/ui/amount.component'
import { Button } from '@/components/ui/button.component'
import { CategoryBadge } from '@/components/ui/category-badge.component'
import { ServiceLogo } from '@/components/ui/service-logo.component'
import { Sheet } from '@/components/ui/sheet.component'
import { useToday } from '@/contexts/clock.context'
import { useLedgerStore } from '@/contexts/ledger.context'
import { listCategoryOptions } from '@/lib/finance/ledger-options.api'
import { ledgerQueryKey } from '@/lib/query/query-keys.utils'
import { type QueuedWrite, useSyncQueue } from '@/lib/query/sync-queue.hook'
import { getBrowserSupabase } from '@/lib/supabase/browser-client'
import { toPgError } from '@/lib/supabase/pg-error.utils'
import { localDate, localTime } from '@/lib/utils/clock.utils'
import { cn } from '@/lib/utils/cn.utils'
import { useWriteTitle } from '../hooks/write-title.hook'
import { writeFields } from '../utils/write-fields.utils'
import { ConflictSheet } from './conflict-view.component'

type WriteProps = {
  write: QueuedWrite
}

type QueueRowProps = WriteProps & {
  onResolveAction: () => void
  onRetryAction: () => void
  onDiscardAction: () => void
}

type QueueListProps = {
  onResolveAction: (id: number) => void
}

type SyncQueuePopoverProps = {
  /** the SyncStatus' name: its live region gives the trigger none */
  label: string
  /** the SyncStatus row that opens the queue */
  children: React.ReactNode
}

type SyncQueueSheetProps = {
  open: boolean
  onOpenChangeAction: (open: boolean) => void
}

type SyncQueueCardProps = {
  className?: string
}

/** the write's sum with the minus of an outflow, as Figma prints it; nothing for a write without one */
function WriteAmount({ write }: WriteProps) {
  const fields = writeFields(write.variables)

  if (!fields.currency || fields.amountMinor === null) {
    return null
  }

  return (
    <Amount minor={fields.direction === 'out' ? -fields.amountMinor : fields.amountMinor} currency={fields.currency} />
  )
}

// Figma 4:80805: a payment shows its service (LetterAvatar without a logo), an operation its CategoryBadge, 32 each
function WriteMark({ write }: WriteProps) {
  const ledgerId = useLedgerStore((ledger) => ledger.ledgerId)
  const categories = useQuery({
    queryKey: ledgerQueryKey('sync', ledgerId, 'categories'),
    queryFn: () => listCategoryOptions(getBrowserSupabase(), ledgerId),
  })
  const fields = writeFields(write.variables)
  const category = categories.data?.find((option) => option.id === fields.categoryId)

  if (category && write.key[1] !== 'payObligation') {
    return <CategoryBadge icon={category.icon} color={category.color} size={32} />
  }

  return fields.label ? (
    <ServiceLogo name={fields.label} size={32} />
  ) : (
    <CategoryBadge icon={null} color={null} size={32} />
  )
}

// Figma 4:80812: mark, title label-medium, a caption of day, time and state, the sum; a failed or conflicting write
// keeps its buttons under it (no frame draws them)
function QueueRow({ write, onResolveAction, onRetryAction, onDiscardAction }: QueueRowProps) {
  const translate = useTranslations('sync.queue')
  const format = useFormatter()
  const timeZone = useLedgerStore((ledger) => ledger.timeZone)
  const today = useToday()
  const writeTitle = useWriteTitle()
  const { name, label } = writeTitle(write)
  const submitted = new Date(write.submittedAt)
  const day =
    localDate(submitted, timeZone) === today
      ? translate('today')
      : format.dateTime(submitted, {
          day: '2-digit',
          month: '2-digit',
          timeZone,
        })
  const forbidden = write.state === 'error' && toPgError(write.error as { code?: string }).kind === 'forbidden'
  const state = forbidden ? translate('forbidden') : translate(`states.${write.state}`)

  return (
    <li className="flex flex-col gap-2 border-t border-border py-2 first:border-t-0">
      <div className="flex items-start gap-3">
        <WriteMark write={write} />
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-label font-medium text-text-primary">
            {[name, label].filter(Boolean).join(' · ')}
          </span>
          <span className="text-caption text-text-secondary">
            {day} {localTime(submitted, timeZone)} · {state}
          </span>
        </div>
        <WriteAmount write={write} />
      </div>
      {write.state === 'error' || write.state === 'conflict' ? (
        <div className="flex gap-2">
          {write.state === 'conflict' ? (
            <Button size="s" onClick={onResolveAction}>
              {translate('resolve')}
            </Button>
          ) : (
            <Button size="s" variant="secondary" onClick={onRetryAction}>
              {translate('retry')}
            </Button>
          )}
          <Button size="s" variant="ghost" onClick={onDiscardAction}>
            {translate('discard')}
          </Button>
        </div>
      ) : null}
    </li>
  )
}

function QueueList({ onResolveAction }: QueueListProps) {
  const sync = useSyncQueue()

  return (
    <ul className="flex flex-col">
      {sync.rows.map((write) => (
        <QueueRow
          key={write.id}
          write={write}
          onResolveAction={() => onResolveAction(write.id)}
          onRetryAction={() => sync.retry(write.id)}
          onDiscardAction={() => sync.discard(write.id)}
        />
      ))}
    </ul>
  )
}

/** the queue's footnote: resending makes no duplicates, and the time of the last update */
function useQueueNote() {
  const translate = useTranslations('sync.queue')
  const timeZone = useLedgerStore((ledger) => ledger.timeZone)
  const { updatedAt } = useSyncQueue()
  const updated = updatedAt ? translate('updatedAt', { time: localTime(new Date(updatedAt), timeZone) }) : ''

  return `${translate('hint')} ${updated}`.trim()
}

/** the write whose conflict is open, while it is still a conflict in the queue */
function useResolving() {
  const { queue } = useSyncQueue()
  const [resolvingId, setResolvingId] = useState<number | null>(null)
  const resolving = queue.find((write) => write.id === resolvingId && write.state === 'conflict')

  return [resolving, setResolvingId] as const
}

// Figma «Saldo» → Pending sync 4:80539, Popover / Queue 4:80805: on desktop the queue opens over the Sidebar from its
// SyncStatus (380 wide, padding 20, gap 12, radius card, float shadow); a conflict opens its dialog (4:81317)
export function SyncQueuePopover({ label, children }: SyncQueuePopoverProps) {
  const translate = useTranslations('sync.queue')
  const sync = useSyncQueue()
  const note = useQueueNote()
  const [open, setOpen] = useState(false)
  const [resolving, setResolvingId] = useResolving()
  const count = sync.queue.length

  function resolve(id: number) {
    setOpen(false)
    setResolvingId(id)
  }

  return (
    <>
      <Popover.Root open={open} onOpenChange={setOpen}>
        <Popover.Trigger
          aria-label={label}
          className="w-full cursor-pointer rounded-md text-left outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          {children}
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Positioner side="top" align="start" sideOffset={8} collisionPadding={16} className="z-40">
            <Popover.Popup className="flex max-h-(--available-height) w-95 max-w-(--available-width) flex-col gap-3 overflow-y-auto rounded-card border border-border bg-raised p-5 shadow-float outline-none transition-opacity duration-(--duration-base) ease-(--ease-standard) data-ending-style:opacity-0 data-starting-style:opacity-0">
              {count > 0 ? (
                <div className="flex items-center gap-2">
                  <SyncStatus state="pending" platform="topbar" label={translate('count', { count })} />
                  <Popover.Title className="flex-1 text-body font-semibold text-text-primary">
                    {translate('waitingTitle', { count })}
                  </Popover.Title>
                </div>
              ) : (
                <Popover.Title className="text-body text-text-secondary">{translate('empty')}</Popover.Title>
              )}
              <QueueList onResolveAction={resolve} />
              <p className="text-caption text-text-secondary">{note}</p>
              <Button
                variant="secondary"
                disabled={!sync.online || count === 0 || sync.sending}
                onClick={() => void sync.syncNow()}
              >
                <RefreshCw aria-hidden className="size-5" />
                {translate('syncNow')}
              </Button>
            </Popover.Popup>
          </Popover.Positioner>
        </Popover.Portal>
      </Popover.Root>
      {resolving ? (
        <ConflictSheet
          write={resolving}
          open
          onOpenChangeAction={(next) => {
            if (!next) {
              setResolvingId(null)
            }
          }}
        />
      ) : null}
    </>
  )
}

// Figma 41:108796: the phone's queue from its SyncStatus pill (offline, error, conflict), a BottomSheet titled «sync
// queue» with the count, the rows, the note and «sync now» in its body. A conflict replaces it with its bottom
// sheet (4:81611).
export function SyncQueueSheet({ open, onOpenChangeAction }: SyncQueueSheetProps) {
  const translate = useTranslations('sync.queue')
  const sync = useSyncQueue()
  const note = useQueueNote()
  const [resolving, setResolvingId] = useResolving()

  if (resolving) {
    return <ConflictSheet write={resolving} open={open} onOpenChangeAction={onOpenChangeAction} />
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChangeAction} title={translate('title')}>
      {sync.queue.length > 0 ? (
        <>
          <p className="text-label font-semibold text-text-primary">
            {translate('waiting', { count: sync.queue.length })}
          </p>
          <QueueList onResolveAction={setResolvingId} />
        </>
      ) : (
        <p className="text-body text-text-secondary">{translate('empty')}</p>
      )}
      <p className="text-caption text-text-secondary">{note}</p>
      <Button
        variant="secondary"
        disabled={!sync.online || sync.queue.length === 0 || sync.sending}
        onClick={() => void sync.syncNow()}
      >
        <RefreshCw aria-hidden className="size-5" />
        {translate('syncNow')}
      </Button>
    </Sheet>
  )
}

// Figma «Saldo» → Pending sync / Mobile 4:80844, Card / Queue 4:81023: while writes are on their way the phone lists
// them on the page (padding 16, gap 8, rows 4/0), with a «sync now» button
export function SyncQueueCard({ className }: SyncQueueCardProps) {
  const translate = useTranslations('sync')
  const sync = useSyncQueue()
  const writeTitle = useWriteTitle()

  return (
    <section className={cn('flex flex-col gap-2 rounded-card bg-card p-4 shadow-card', className)}>
      <SyncStatus state="pending" platform="topbar" label={translate('status.pending', { count: sync.queue.length })} />
      <ul className="flex flex-col">
        {sync.queue.map((write) => {
          const { name, label } = writeTitle(write)

          return (
            <li key={write.id} className="flex items-center justify-between gap-3 py-1">
              <span className="truncate text-label text-text-primary">{[name, label].filter(Boolean).join(' · ')}</span>
              <WriteAmount write={write} />
            </li>
          )
        })}
      </ul>
      <Button variant="secondary" disabled={!sync.online || sync.sending} onClick={() => void sync.syncNow()}>
        {translate('queue.syncNow')}
      </Button>
    </section>
  )
}
