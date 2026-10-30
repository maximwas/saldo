'use client'

import { useQuery } from '@tanstack/react-query'
import { useFormatter, useTranslations } from 'next-intl'
import { Amount } from '@/components/ui/amount.component'
import { Button } from '@/components/ui/button.component'
import { useLedgerStore } from '@/contexts/ledger.context'
import { listAccountOptions } from '@/lib/finance/ledger-options.api'
import { useMemberNames } from '@/lib/members/member-names.hook'
import { ledgerQueryKey } from '@/lib/query/query-keys.utils'
import type { QueuedWrite } from '@/lib/query/sync-queue.hook'
import { getBrowserSupabase } from '@/lib/supabase/browser-client'
import { cn } from '@/lib/utils/cn.utils'
import { getServerVersion } from '../api/sync.api'
import { type WriteFields, withVersion, writeFields } from '../utils/write-fields.utils'

type ConflictViewProps = {
  write: QueuedWrite
  onReplaceAction: (key: readonly unknown[], variables: unknown) => void
  onDiscardAction: () => void
}

type VersionCardProps = {
  title: string
  fields: WriteFields
  accountName: (id: string | null) => string
  /** theirs: the version on the server, outlined */
  server?: boolean
}

function VersionCard({ title, fields, accountName, server = false }: VersionCardProps) {
  const translate = useTranslations('sync.conflict.fields')
  const format = useFormatter()
  const rows = [
    {
      label: translate('amount'),
      value: fields.currency ? <Amount minor={fields.amountMinor} currency={fields.currency} /> : '—',
    },
    {
      label: translate('date'),
      value: fields.date
        ? format.dateTime(new Date(`${fields.date}T12:00:00Z`), {
            dateStyle: 'short',
            timeZone: 'UTC',
          })
        : '—',
    },
    {
      label: translate('account'),
      value: accountName(fields.accountId),
    },
    {
      label: translate('note'),
      value: fields.note ?? '—',
    },
  ]

  return (
    <section
      className={cn(
        'flex flex-col gap-3 rounded-md p-4',
        server ? 'border border-warning bg-warning-soft' : 'bg-subtle',
      )}
    >
      <h3 className="text-label font-semibold text-text-primary">{title}</h3>
      <dl className="flex flex-col gap-2">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between gap-3 text-label">
            <dt className="text-text-secondary">{row.label}</dt>
            <dd className="truncate text-right font-medium text-text-primary">{row.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

// Figma «Saldo» → App states, Conflict 4:81050 (dialog) / 4:81431 (bottom sheet): both versions side by side,
// nothing overwritten until the person picks one. A payment keeps its own operation as a separate expense instead of
// paying twice (architecture §11 risk 9). shortcut: no «merge by hand», the person edits the record after «take theirs».
export function ConflictView({ write, onReplaceAction, onDiscardAction }: ConflictViewProps) {
  const translate = useTranslations('sync.conflict')
  const format = useFormatter()
  const ledgerId = useLedgerStore((ledger) => ledger.ledgerId)
  const names = useMemberNames()
  const server = useQuery({
    queryKey: ledgerQueryKey('sync', ledgerId, 'conflict', write.id),
    queryFn: () => getServerVersion(getBrowserSupabase(), write),
  })
  const accounts = useQuery({
    queryKey: ledgerQueryKey('sync', ledgerId, 'accounts'),
    queryFn: () => listAccountOptions(getBrowserSupabase(), ledgerId),
  })
  const accountName = (id: string | null) => accounts.data?.find((account) => account.id === id)?.name ?? '—'
  const time = (moment: number | string | null) =>
    moment
      ? format.dateTime(new Date(moment), {
          hour: '2-digit',
          minute: '2-digit',
        })
      : ''
  const isPayment = write.key[1] === 'payObligation'
  const variables = (write.variables ?? {}) as Record<string, unknown>
  const author = server.data?.changedBy ? names[server.data.changedBy] : undefined
  const mine = server.data?.version != null ? withVersion(write.variables, server.data.version) : null
  let theirs: React.ReactNode = <p className="text-label text-text-secondary">{translate('loading')}</p>

  if (server.data) {
    const title = isPayment
      ? translate('paidBy', {
          name: author ?? translate('someone'),
          time: time(server.data.changedAt),
        })
      : translate('theirs', { time: time(server.data.changedAt) })

    theirs = <VersionCard title={title} fields={writeFields(server.data.fields)} accountName={accountName} server />
  } else if (server.isSuccess) {
    theirs = <p className="text-label text-text-secondary">{translate('gone')}</p>
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-body text-text-secondary">{translate('lead')}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <VersionCard
          title={translate('mine', { time: time(write.submittedAt) })}
          fields={writeFields(write.variables)}
          accountName={accountName}
        />
        {theirs}
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onDiscardAction}>
          {translate('takeTheirs')}
        </Button>
        {isPayment && variables.newOperation ? (
          <Button
            onClick={() =>
              onReplaceAction(['operations', 'createOperation'], {
                // create_operation's input names every link; a payment's operation has neither
                refund_of_id: null,
                duplicated_from_id: null,
                ...(variables.newOperation as object),
              })
            }
          >
            {translate('keepAsExpense')}
          </Button>
        ) : null}
        {mine ? <Button onClick={() => onReplaceAction(write.key, mine)}>{translate('keepMine')}</Button> : null}
      </div>
    </div>
  )
}
