'use client'

import { RefreshCw } from 'lucide-react'
import { useFormatter, useMessages, useTranslations } from 'next-intl'
import { useState } from 'react'
import { Amount } from '@/components/ui/amount.component'
import { Button } from '@/components/ui/button.component'
import { Sheet } from '@/components/ui/sheet.component'
import { type QueuedWrite, useSyncQueue } from '@/lib/query/sync-queue.hook'
import { toPgError } from '@/lib/supabase/pg-error.utils'
import { writeFields } from '../utils/write-fields.utils'
import { ConflictView } from './conflict-view.component'

type SyncQueueSheetProps = {
  open: boolean
  onOpenChangeAction: (open: boolean) => void
}

type QueueRowProps = {
  write: QueuedWrite
  onResolveAction: () => void
  onRetryAction: () => void
  onDiscardAction: () => void
}

function QueueRow({ write, onResolveAction, onRetryAction, onDiscardAction }: QueueRowProps) {
  const translate = useTranslations('sync.queue')
  const format = useFormatter()
  // the write's name by its [feature, write] key; a key with no text yet falls back to «Change»
  const titles: Record<string, Partial<Record<string, string>> | string> = useMessages().sync.queue.writes
  const [feature, name] = write.key as [string, string]
  const fields = writeFields(write.variables)
  const group = titles[feature]
  const writeName = typeof group === 'object' ? group[name] : undefined
  const title = [writeName ?? translate('writes.other'), fields.label].filter(Boolean).join(' · ')
  const forbidden = write.state === 'error' && toPgError(write.error as { code?: string }).kind === 'forbidden'
  const state = forbidden ? translate('forbidden') : translate(`states.${write.state}`)

  return (
    <li className="flex flex-col gap-2 border-b border-border py-3 last:border-b-0">
      <div className="flex items-center gap-3">
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-body font-medium text-text-primary">{title}</span>
          <span className="text-caption text-text-secondary">
            {format.dateTime(new Date(write.submittedAt), {
              hour: '2-digit',
              minute: '2-digit',
            })}{' '}
            · {state}
          </span>
        </div>
        {fields.currency && fields.amountMinor !== null ? (
          <span className="text-body font-medium text-text-primary">
            {fields.direction === 'out' ? '−' : ''}
            <Amount minor={fields.amountMinor} currency={fields.currency} />
          </span>
        ) : null}
      </div>
      {write.state === 'pending' ? null : (
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
      )}
    </li>
  )
}

// Figma «Saldo» → App states, Pending sync 4:80539 / 4:80844: what waits, why, and «Sync now»; a conflict
// opens its two versions (4:81050). The same sheet on desktop (from the Sidebar) and mobile (from the banner).
export function SyncQueueSheet({ open, onOpenChangeAction }: SyncQueueSheetProps) {
  const translate = useTranslations('sync')
  const format = useFormatter()
  const sync = useSyncQueue()
  const [resolvingId, setResolvingId] = useState<number | null>(null)
  const resolving = sync.queue.find((write) => write.id === resolvingId && write.state === 'conflict')

  if (resolving) {
    return (
      <Sheet open={open} onOpenChange={onOpenChangeAction} title={translate('conflict.title')}>
        <ConflictView
          write={resolving}
          onDiscardAction={() => sync.discard(resolving.id)}
          onReplaceAction={(key, variables) => sync.replace(resolving.id, key, variables)}
        />
      </Sheet>
    )
  }

  const updated = sync.updatedAt
    ? translate('queue.updatedAt', {
        time: format.dateTime(new Date(sync.updatedAt), {
          hour: '2-digit',
          minute: '2-digit',
        }),
      })
    : ''

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChangeAction}
      title={translate('queue.title')}
      footer={
        <Button
          variant="secondary"
          disabled={!sync.online || sync.queue.length === 0}
          onClick={() => void sync.syncNow()}
        >
          <RefreshCw aria-hidden size={16} />
          {translate('queue.syncNow')}
        </Button>
      }
    >
      {sync.queue.length > 0 ? (
        <>
          <p className="text-label font-semibold text-text-primary">
            {translate('queue.waiting', { count: sync.queue.length })}
          </p>
          <ul>
            {sync.queue.map((write) => (
              <QueueRow
                key={write.id}
                write={write}
                onResolveAction={() => setResolvingId(write.id)}
                onRetryAction={() => sync.retry(write.id)}
                onDiscardAction={() => sync.discard(write.id)}
              />
            ))}
          </ul>
        </>
      ) : (
        <p className="text-body text-text-secondary">{translate('queue.empty')}</p>
      )}
      <p className="text-caption text-text-tertiary">
        {translate('queue.hint')} {updated}
      </p>
    </Sheet>
  )
}
