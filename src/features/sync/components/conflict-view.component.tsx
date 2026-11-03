'use client'

import { useQuery } from '@tanstack/react-query'
import { useFormatter, useTranslations } from 'next-intl'
import { Amount } from '@/components/ui/amount.component'
import { Button } from '@/components/ui/button.component'
import { LetterAvatar } from '@/components/ui/service-logo.component'
import { Sheet, useIsDesktop } from '@/components/ui/sheet.component'
import { Bone } from '@/components/ui/skeleton.component'
import { notify } from '@/components/ui/toaster.component'
import { useLedgerStore } from '@/contexts/ledger.context'
import { listAccountOptions } from '@/lib/finance/ledger-options.api'
import { useMemberNames } from '@/lib/members/member-names.hook'
import { ledgerQueryKey } from '@/lib/query/query-keys.utils'
import { type QueuedWrite, useSyncQueue } from '@/lib/query/sync-queue.hook'
import { getBrowserSupabase } from '@/lib/supabase/browser-client'
import { localTime } from '@/lib/utils/clock.utils'
import { cn } from '@/lib/utils/cn.utils'
import { getServerVersion } from '../api/sync.api'
import { useWriteTitle } from '../hooks/write-title.hook'
import { type WriteFields, withVersion, writeFields } from '../utils/write-fields.utils'

type ConflictSheetProps = {
  write: QueuedWrite
  open: boolean
  onOpenChangeAction: (open: boolean) => void
}

type VersionProps = {
  title: string
  /** whose version: their initial in a LetterAvatar 24 */
  author: string | undefined
  /** theirs: the version on the server, outlined in warning */
  server?: boolean
  children: React.ReactNode
}

type DetailRowsProps = {
  fields: WriteFields
  accountName: (id: string | null) => string
}

type SummaryLineProps = DetailRowsProps & {
  /** the sums match: the line leaves the sum out, a caption under both says it once */
  sameAmount: boolean
}

// Figma 4:81365 / 4:81659: radius inner, subtle, or warning-soft with a warning border for theirs; the header is the
// author's LetterAvatar 24 and label-semibold; padding 16 in the dialog, 12 in the bottom sheet
function Version({ title, author, server = false, children }: VersionProps) {
  return (
    <section
      className={cn(
        'flex flex-col gap-1 rounded-inner p-3 md:flex-1 md:p-4',
        server ? 'border border-warning bg-warning-soft' : 'bg-subtle',
      )}
    >
      <div className="flex items-center gap-2">
        {author ? <LetterAvatar name={author} size={24} /> : null}
        <h3 className="text-label font-semibold text-text-primary">{title}</h3>
      </div>
      {children}
    </section>
  )
}

// Figma Parts / DetailRow 2:21449 in the dialog: label left, value body-medium right, 12/0 padding, a border under each
function DetailRows({ fields, accountName }: DetailRowsProps) {
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
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
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
    <dl className="flex flex-col">
      {rows.map((row) => (
        <div key={row.label} className="flex justify-between gap-3 border-b border-border py-3">
          <dt className="flex-1 text-label text-text-secondary">{row.label}</dt>
          <dd className="truncate text-right text-body font-medium text-text-primary">{row.value}</dd>
        </div>
      ))}
    </dl>
  )
}

// Figma 4:81668 in the bottom sheet: one label line of date, account and comment
function SummaryLine({ fields, accountName, sameAmount }: SummaryLineProps) {
  const translate = useTranslations('sync.conflict')
  const format = useFormatter()
  const parts = [
    fields.date
      ? format.dateTime(new Date(`${fields.date}T12:00:00Z`), {
          day: '2-digit',
          month: '2-digit',
          timeZone: 'UTC',
        })
      : null,
    accountName(fields.accountId),
    fields.note ? translate('quoted', { note: fields.note }) : translate('noNote'),
  ]

  return (
    <p className="text-label text-text-primary">
      {/* shortcut: Figma draws only equal sums; a differing one leads the line until a frame says where it goes */}
      {sameAmount || !fields.currency ? null : (
        <>
          <Amount minor={fields.amountMinor} currency={fields.currency} className="text-label font-normal" /> ·{' '}
        </>
      )}
      {parts.filter(Boolean).join(' · ')}
    </p>
  )
}

/** the signed-in person's user id, read from the stored session (no request), to name «your» version */
function useMyId() {
  const ledgerId = useLedgerStore((ledger) => ledger.ledgerId)
  const session = useQuery({
    queryKey: ledgerQueryKey('sync', ledgerId, 'me'),
    queryFn: async () => (await getBrowserSupabase().auth.getSession()).data.session?.user.id ?? null,
    staleTime: Number.POSITIVE_INFINITY,
  })

  return session.data ?? null
}

// Figma «Saldo» → Conflict 4:81050, Dialog 4:81317 (640, the record in the title, the versions side by side as
// detail rows, three equal buttons) / 4:81431, BottomSheet 4:81611 (the record in the intro, one line per version,
// buttons stacked, the main one first). Nothing is overwritten until the person picks. A payment keeps its own
// operation as a separate expense instead of paying twice (architecture §11 risk 9).
// After a choice the sheet closes and a success toast says what stayed (41:106725 / 41:109094).
// shortcut: no «merge by hand» button (no frame for the merge), the person edits the record after «take theirs».
export function ConflictSheet({ write, open, onOpenChangeAction }: ConflictSheetProps) {
  const translate = useTranslations('sync.conflict')
  const desktop = useIsDesktop()
  const sync = useSyncQueue()
  const ledgerId = useLedgerStore((ledger) => ledger.ledgerId)
  const timeZone = useLedgerStore((ledger) => ledger.timeZone)
  const names = useMemberNames()
  const myId = useMyId()
  const writeTitle = useWriteTitle()
  const server = useQuery({
    queryKey: ledgerQueryKey('sync', ledgerId, 'conflict', write.id),
    queryFn: () => getServerVersion(getBrowserSupabase(), write),
  })
  const accounts = useQuery({
    queryKey: ledgerQueryKey('sync', ledgerId, 'accounts'),
    queryFn: () => listAccountOptions(getBrowserSupabase(), ledgerId),
  })
  const accountName = (id: string | null) => accounts.data?.find((account) => account.id === id)?.name ?? '—'
  const time = (moment: number | string | null) => (moment ? localTime(new Date(moment), timeZone) : '')
  const { name, label } = writeTitle(write)
  const what = [name, label].filter(Boolean).join(' · ')
  const variables = (write.variables ?? {}) as Record<string, unknown>
  const mineFields = writeFields(write.variables)
  const theirsFields = server.data ? writeFields(server.data.fields) : null
  const author = server.data?.changedBy ? names[server.data.changedBy] : undefined
  const myName = myId ? names[myId] : undefined
  const theirsName = author ?? translate('someone')
  const mine = server.data?.version != null ? withVersion(write.variables, server.data.version) : null

  // the write leaves the queue, so the sheet closes at once instead of through its exit transition
  function choose(apply: () => void, toast: string) {
    apply()
    onOpenChangeAction(false)
    notify.success(toast)
  }

  const sameAmount =
    theirsFields !== null &&
    mineFields.amountMinor === theirsFields.amountMinor &&
    mineFields.currency === theirsFields.currency
  const keepAsExpense =
    write.key[1] === 'payObligation' && variables.newOperation ? (
      <Button
        onClick={() =>
          choose(
            () =>
              sync.replace(write.id, ['operations', 'createOperation'], {
                // create_operation's input names every link; a payment's operation has neither
                refund_of_id: null,
                duplicated_from_id: null,
                ...(variables.newOperation as object),
              }),
            translate('keptMine'),
          )
        }
      >
        {translate('keepAsExpense')}
      </Button>
    ) : null
  const keepMine = mine ? (
    <Button
      variant="secondary"
      onClick={() => choose(() => sync.replace(write.id, write.key, mine), translate('keptMine'))}
    >
      {translate('keepMine')}
    </Button>
  ) : null
  const takeTheirs = (
    <Button variant="secondary" onClick={() => choose(() => sync.discard(write.id), translate('tookTheirs'))}>
      {translate('takeTheirs')}
    </Button>
  )
  // beside «mine» on desktop the row stretches it to the same height
  let theirs: React.ReactNode = <Bone className={cn('rounded-md', desktop ? 'flex-1' : 'h-16')} />

  if (server.isSuccess && !theirsFields) {
    theirs = <p className="text-label text-text-secondary">{translate('gone')}</p>
  }

  if (desktop) {
    if (theirsFields) {
      theirs = (
        <Version
          title={translate('theirsBy', {
            name: theirsName,
            time: time(server.data?.changedAt ?? null),
          })}
          author={theirsName}
          server
        >
          <DetailRows fields={theirsFields} accountName={accountName} />
        </Version>
      )
    }

    // the record in lower case after the colon, as Figma's title
    const titleOf = [name.charAt(0).toLocaleLowerCase() + name.slice(1), label].filter(Boolean).join(' ')

    return (
      <Sheet open={open} onOpenChange={onOpenChangeAction} size="lg" title={translate('titleOf', { what: titleOf })}>
        <p className="text-body text-text-primary">
          {author ? translate('leadBy', { name: author }) : translate('lead')}
        </p>
        <div className="flex gap-3">
          <Version title={translate('mine', { time: time(write.submittedAt) })} author={myName}>
            <DetailRows fields={mineFields} accountName={accountName} />
          </Version>
          {theirs}
        </div>
        <div className="flex justify-end gap-3 *:flex-1">
          {keepMine}
          {takeTheirs}
          {keepAsExpense}
        </div>
      </Sheet>
    )
  }

  if (theirsFields) {
    theirs = (
      <Version
        title={translate('theirsShort', {
          name: theirsName,
          time: time(server.data?.changedAt ?? null),
        })}
        author={theirsName}
        server
      >
        <SummaryLine fields={theirsFields} accountName={accountName} sameAmount={sameAmount} />
      </Version>
    )
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChangeAction} title={translate('title')}>
      <p className="text-label text-text-secondary">
        {author
          ? translate('intro', {
              what,
              name: author,
            })
          : translate('introAnon', { what })}
      </p>
      <Version title={translate('mineShort', { time: time(write.submittedAt) })} author={myName}>
        <SummaryLine fields={mineFields} accountName={accountName} sameAmount={sameAmount} />
      </Version>
      {theirs}
      {sameAmount && mineFields.currency ? (
        <p className="text-caption text-text-secondary">
          {translate('sameAmount')}{' '}
          <Amount
            minor={mineFields.amountMinor}
            currency={mineFields.currency}
            className="text-caption font-normal text-text-secondary"
          />
        </p>
      ) : null}
      {keepAsExpense}
      {keepMine}
      {takeTheirs}
    </Sheet>
  )
}
