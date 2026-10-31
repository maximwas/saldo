'use client'

import { onlineManager, useQuery, useQueryClient } from '@tanstack/react-query'
import { Copy, Trash2, TriangleAlert, Undo2 } from 'lucide-react'
import { useFormatter, useLocale, useTranslations } from 'next-intl'
import { useState } from 'react'
import { Amount } from '@/components/ui/amount.component'
import { Button } from '@/components/ui/button.component'
import { Menu } from '@/components/ui/menu.component'
import { SegmentedControl } from '@/components/ui/segmented-control.component'
import { Sheet, useIsDesktop } from '@/components/ui/sheet.component'
import { notify } from '@/components/ui/toaster.component'
import { useClock } from '@/contexts/clock.context'
import { useCanWrite, useLedgerStore } from '@/contexts/ledger.context'
import { useMemberNames } from '@/lib/members/member-names.hook'
import { formatMinor, fromMinor } from '@/lib/money/money.utils'
import { toPgError } from '@/lib/supabase/pg-error.utils'
import { localTime } from '@/lib/utils/clock.utils'
import { useDraftsStore } from '@/store/drafts.store'
import {
  useCreateOperation,
  useCreateTransfer,
  useDeleteOperation,
  useUpdateOperation,
  useUploadReceipt,
} from '../api/operations.mutations'
import { operationQueries } from '../api/operations.queries'
import { ADD_KINDS, type AddKind, type OperationItem } from '../operations.types'
import {
  type OperationFormValues,
  toCreateOperationInput,
  toUpdateOperationInput,
} from '../schemas/operation-form.schema'
import { type TransferFormValues, toCreateTransferInput } from '../schemas/transfer-form.schema'
import { displayAmount, refundableMinor } from '../utils/operation-display.utils'
import { formatRate, impliedRate } from '../utils/rate.utils'
import { OperationForm } from './operation-form.component'
import { OperationSource } from './operation-source.component'
import { ReceiptField } from './receipt-field.component'
import { RefundForm } from './refund-form.component'
import { TransferForm } from './transfer-form.component'

export type EditorTarget =
  | {
      mode: 'create'
      kind: AddKind
      /** a duplicate starts from the values of another operation */
      defaults?: Partial<OperationFormValues>
      /** and keeps a link to it (operations.duplicated_from_id) */
      duplicatedFromId?: string
    }
  | {
      mode: 'edit'
      item: OperationItem
    }

type OperationEditorProps = {
  open: boolean
  target: EditorTarget
  onOpenChangeAction: (open: boolean) => void
  /** the global «Add» mirrors the kind into ?add= */
  onKindChangeAction?: (kind: AddKind) => void
  onDuplicateAction?: (defaults: Partial<OperationFormValues>, sourceId: string) => void
  /** a refund's purchase chip opens that purchase */
  onOpenAction?: (item: OperationItem) => void
}

const FORM_ID = 'operation-editor-form'
const REFUND_FORM_ID = 'operation-refund-form'

const toFormValues = (item: OperationItem, timeZone: string): Partial<OperationFormValues> => ({
  kind: item.row.kind as OperationFormValues['kind'],
  direction: item.row.direction,
  amount: fromMinor(item.row.amountMinor, item.row.currency),
  currency: item.row.currency as OperationFormValues['currency'],
  accountId: item.row.accountId,
  categoryId: item.row.categoryId,
  occurredOn: item.row.occurredOn,
  occurredTime: localTime(new Date(item.row.occurredAt), timeZone),
  counterparty: item.row.counterparty ?? '',
  note: item.row.note ?? '',
})

// Figma Saldo file → New operation (Dialog 2:10240 on desktop, BottomSheet 2:10281 on mobile), Operations / Delete 5:99099.
// One sheet for: a new operation or transfer, editing, a read-only view (viewer, transfer, refund, adjustment) and the
// delete confirmation. Mount it keyed by useOpenSession: every opening gets a fresh form and fresh ids, while a retry
// or a double click inside one opening reuses the same id, so the RPC (idempotent on id) writes one row.
export function OperationEditor({
  open,
  target,
  onOpenChangeAction,
  onKindChangeAction,
  onDuplicateAction,
  onOpenAction,
}: OperationEditorProps) {
  const translate = useTranslations('operations')
  const translateErrors = useTranslations('errors.db')
  const translateKinds = useTranslations('operations.kinds')
  const translateSync = useTranslations('sync')
  const locale = useLocale()
  const formatter = useFormatter()
  const clock = useClock()
  const ledgerId = useLedgerStore((ledger) => ledger.ledgerId)
  const timeZone = useLedgerStore((ledger) => ledger.timeZone)
  const canWrite = useCanWrite()
  const members = useMemberNames()
  const queryClient = useQueryClient()
  const options = useQuery(operationQueries.options(ledgerId))
  const [newId] = useState(() => crypto.randomUUID())
  // a blank new operation keeps a draft per space; a duplicate starts from its source instead
  const draftKey = target.mode === 'create' && !target.defaults ? `operations:create:${ledgerId}` : undefined
  // an edited income / expense starts on its own kind; the switch flips it (update_operation takes kind + direction)
  const [kind, setKind] = useState<AddKind>(() => {
    if (target.mode === 'create') {
      return target.kind
    }

    return target.item.kind === 'income' ? 'income' : 'expense'
  })
  const [receipt, setReceipt] = useState<File | null>(null)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const desktop = useIsDesktop()
  const [refunding, setRefunding] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [conflict, setConflict] = useState(false)
  const [saving, setSaving] = useState(false)
  const createOperation = useCreateOperation()
  const updateOperation = useUpdateOperation()
  const deleteOperation = useDeleteOperation()
  const createTransfer = useCreateTransfer()
  const uploadReceipt = useUploadReceipt()

  const item = target.mode === 'edit' ? target.item : null
  // only a plain income / expense can be edited by a person with write access; the rest is read-only (a transfer
  // is deleted whole and created again, a refund and an adjustment have their own flows)
  const editable =
    item !== null && canWrite && !item.row.transferId && (item.kind === 'income' || item.kind === 'expense')
  const mode = pickMode()
  const accounts = options.data?.accounts ?? []
  const categories = options.data?.categories ?? []
  const accountName = (id: string) => accounts.find((account) => account.id === id)?.name ?? '…'
  const categoryName = (id: string | null) => categories.find((category) => category.id === id)?.name ?? null
  const refunds = useQuery({
    ...operationQueries.refunds(ledgerId),
    enabled: item !== null,
  })
  const refundedMinor = item ? (refunds.data?.refundedById[item.row.id] ?? 0) : 0
  const refundLeft = item ? refundableMinor(item.row.amountMinor, refundedMinor) : 0
  const purchase = item?.row.refundOfId ? refunds.data?.purchases[item.row.refundOfId] : undefined
  // a fee of a transfer is not a purchase; a fully refunded one has nothing left
  const canRefund = editable && item?.kind === 'expense' && refunds.isSuccess && refundLeft > 0
  const title = pickTitle()

  function pickMode() {
    if (target.mode === 'create') {
      return 'create'
    }

    return editable ? 'edit' : 'details'
  }

  function pickTitle() {
    const isTransfer = item?.kind === 'transfer'

    if (refunding) {
      return translate('refund.title')
    }

    if (confirmingDelete && item) {
      return translate(isTransfer ? 'form.deleteTransferTitle' : 'form.deleteTitle')
    }

    if (mode === 'create') {
      return translate(kind === 'transfer' ? 'form.transferTitle' : 'form.newTitle')
    }

    if (mode === 'edit') {
      return translate('form.editingTitle')
    }

    return translate(isTransfer ? 'form.transferTitle' : 'form.editTitle')
  }

  function renderCreateForm() {
    if (options.isPending) {
      return <div aria-busy className="h-64 rounded-md bg-subtle" />
    }

    if (kind === 'transfer') {
      return <TransferForm formId={FORM_ID} onSubmitAction={saveTransfer} />
    }

    return (
      <OperationForm
        formId={FORM_ID}
        kind={kind}
        defaults={target.mode === 'create' ? target.defaults : undefined}
        draftKey={draftKey}
        onSubmitAction={saveOperation}
      >
        {/* Figma 2:17848 / 2:19885: the income form has no receipt */}
        {kind === 'expense' ? (
          <ReceiptField operationId={null} file={receipt} onFileChangeAction={setReceipt} canEdit />
        ) : null}
      </OperationForm>
    )
  }

  // offline the write waits in the device's queue: the toast says it is kept here, not that it is saved
  function done(message: string) {
    if (onlineManager.isOnline()) {
      notify.success(message)
    } else {
      notify.info(translateSync('savedOffline'))
    }
  }

  function changeKind(next: AddKind) {
    setKind(next)
    onKindChangeAction?.(next)
  }

  function fail(caught: unknown) {
    const pgError = toPgError(
      caught as {
        code?: string
        message?: string
      },
    )

    if (pgError.kind === 'conflict') {
      setConflict(true)
    } else {
      setError(translateErrors(pgError.kind))
    }
  }

  async function uploadPending(id: string) {
    if (!receipt) {
      return
    }

    try {
      await uploadReceipt.mutateAsync({
        operationId: id,
        file: receipt,
      })
    } catch {
      notify.error(translate('form.receiptFailed'))
    }
  }

  async function run(action: () => Promise<void>) {
    if (saving) {
      return
    }

    setSaving(true)
    setError(null)

    try {
      await action()
      onOpenChangeAction(false)
    } catch (caught) {
      fail(caught)
    } finally {
      setSaving(false)
    }
  }

  const saveOperation = (values: OperationFormValues) =>
    run(async () => {
      if (item) {
        await updateOperation.mutateAsync(
          toUpdateOperationInput(values, clock, {
            id: item.row.id,
            expectedVersion: item.row.version,
          }),
        )
        await uploadPending(item.row.id)
        done(translate('toast.updated'))

        return
      }

      await createOperation.mutateAsync(
        toCreateOperationInput(values, clock, {
          id: newId,
          ledgerId,
          duplicatedFromId: target.mode === 'create' ? target.duplicatedFromId : undefined,
        }),
      )

      if (draftKey) {
        useDraftsStore.getState().clear(draftKey)
      }

      await uploadPending(newId)
      done(translate('toast.created'))
    })

  const saveRefund = (values: OperationFormValues) =>
    run(async () => {
      if (!item) {
        return
      }

      await createOperation.mutateAsync(
        toCreateOperationInput(values, clock, {
          id: newId,
          ledgerId,
          refundOfId: item.row.id,
        }),
      )
      done(translate('refund.done'))
    })

  const saveTransfer = (values: TransferFormValues) =>
    run(async () => {
      // a stale «received» amount of a same-currency pair must not be sent
      const sameCurrency = values.fromCurrency === values.toCurrency

      await createTransfer.mutateAsync(
        toCreateTransferInput(
          {
            ...values,
            toAmount: sameCurrency ? '' : values.toAmount,
          },
          clock,
          {
            id: newId,
            ledgerId,
          },
        ),
      )
      done(translate('toast.transferCreated'))
    })

  const remove = () =>
    run(async () => {
      if (!item) {
        return
      }

      await deleteOperation.mutateAsync({
        id: item.row.id,
        expectedVersion: item.row.version,
      })
      done(translate('toast.deleted'))
    })

  function refresh() {
    void queryClient.invalidateQueries({ queryKey: ['operations', ledgerId] })
    onOpenChangeAction(false)
  }

  const pending = saving
  const cancel = (
    <Button type="button" variant="secondary" onClick={() => onOpenChangeAction(false)}>
      {translate('form.cancel')}
    </Button>
  )
  let footer: React.ReactNode

  if (refunding) {
    footer = (
      <>
        {cancel}
        <Button type="submit" form={REFUND_FORM_ID} disabled={pending}>
          {translate('refund.submit')}
        </Button>
      </>
    )
  } else if (confirmingDelete) {
    footer = (
      <>
        <Button type="button" variant="secondary" onClick={() => setConfirmingDelete(false)}>
          {translate('form.cancel')}
        </Button>
        <Button type="button" variant="danger" disabled={pending || conflict} onClick={remove}>
          {translate('form.delete')}
        </Button>
      </>
    )
  } else if (mode === 'create') {
    footer = (
      <>
        {cancel}
        <Button type="submit" form={FORM_ID} disabled={pending || options.isPending}>
          {translate(kind === 'transfer' ? 'form.saveTransfer' : 'form.save')}
        </Button>
      </>
    )
  } else if (mode === 'edit' && item) {
    // Figma 5:101464 / 32:95477: Duplicate and Delete live in the header «···» menu (33:101623 / 33:101738)
    footer = (
      <>
        {cancel}
        <Button type="submit" form={FORM_ID} disabled={pending || options.isPending || conflict}>
          {translate('form.saveChanges')}
        </Button>
      </>
    )
  } else if (canWrite && item) {
    footer = (
      <>
        <Button type="button" variant="danger" disabled={pending} onClick={() => setConfirmingDelete(true)}>
          {translate('form.delete')}
        </Button>
        <Button type="button" variant="secondary" onClick={() => onOpenChangeAction(false)}>
          {translate('form.close')}
        </Button>
      </>
    )
  } else {
    footer = (
      <Button type="button" variant="secondary" onClick={() => onOpenChangeAction(false)}>
        {translate('form.close')}
      </Button>
    )
  }

  const editMenu =
    mode === 'edit' && item && !refunding && !confirmingDelete ? (
      <Menu
        label={translate('form.actions')}
        items={[
          {
            label: translate('form.duplicate'),
            Icon: Copy,
            disabled: pending,
            onSelect: () => onDuplicateAction?.(toFormValues(item, timeZone), item.row.id),
          },
          {
            label: translate('form.delete'),
            Icon: Trash2,
            danger: true,
            disabled: pending,
            onSelect: () => setConfirmingDelete(true),
          },
        ]}
        // Figma: 36 like ✕ in the dialog (33:101623); in the sheet (33:101738) the popup ends 4 short of ✕'s right
        // edge, 52 px right of the trigger's
        alignOffset={desktop ? 0 : -52}
        className={`text-text-secondary data-popup-open:bg-transparent ${desktop ? 'size-9' : ''}`}
      />
    ) : null

  const dateLabel = (date: string) =>
    formatter.dateTime(new Date(`${date}T12:00:00Z`), {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    })

  const shortDate = (date: string) =>
    formatter.dateTime(new Date(`${date}T12:00:00Z`), {
      day: '2-digit',
      month: '2-digit',
      timeZone: 'UTC',
    })

  function summary(current: OperationItem) {
    const amount = displayAmount(current)
    const name = current.row.counterparty ?? categoryName(current.row.categoryId) ?? translateKinds(current.kind)

    return {
      amount,
      name,
    }
  }

  let body: React.ReactNode

  if (refunding && item) {
    body = (
      <RefundForm formId={REFUND_FORM_ID} purchase={item.row} limitMinor={refundLeft} onSubmitAction={saveRefund} />
    )
  } else if (confirmingDelete && item) {
    const { amount, name } = summary(item)
    const transfer = item.kind === 'transfer' && item.transfer
    const warning = transfer
      ? translate('deleteConfirm.transfer')
      : translate(item.row.direction === 'out' ? 'deleteConfirm.balanceUp' : 'deleteConfirm.balanceDown', {
          account: accountName(item.row.accountId),
          amount: formatMinor(item.row.amountMinor, item.row.currency, locale),
        })

    body = (
      <>
        <p className="text-body text-text-secondary">
          {name} · {dateLabel(item.row.occurredOn)} · {accountName(item.row.accountId)}
          {' · '}
          {transfer ? null : <Amount minor={amount.minor} currency={amount.currency} />}
        </p>
        <p className="flex items-start gap-3 rounded-inner bg-warning-soft px-4 py-3 text-body text-warning-text">
          <TriangleAlert aria-hidden size={20} className="mt-0.5 shrink-0" />
          {warning}
        </p>
      </>
    )
  } else if (mode === 'create') {
    body = (
      <>
        <SegmentedControl
          stretch="track"
          label={translate('add.typeLabel')}
          options={ADD_KINDS.map((value) => ({
            value,
            label: translate(`add.${value}`),
          }))}
          value={kind}
          onValueChange={changeKind}
        />
        {renderCreateForm()}
      </>
    )
  } else if (mode === 'edit' && item) {
    body = options.isPending ? (
      <div aria-busy className="h-64 rounded-md bg-subtle" />
    ) : (
      <>
        {/* Figma 17:89221 / 17:90017: the paid source sits above the type switch */}
        <OperationSource operationId={item.row.id} />
        {/* Figma 5:101464: the edit sheet keeps the type switch; a transfer is made anew, so only the two kinds flip */}
        <SegmentedControl
          stretch="track"
          label={translate('add.typeLabel')}
          options={ADD_KINDS.map((value) => ({
            value,
            label: translate(`add.${value}`),
          }))}
          value={kind}
          onValueChange={(next) => (next === 'transfer' ? undefined : setKind(next))}
        />
        <OperationForm
          formId={FORM_ID}
          kind={kind === 'income' ? 'income' : 'expense'}
          defaults={toFormValues(item, timeZone)}
          onSubmitAction={saveOperation}
        >
          <ReceiptField operationId={item.row.id} file={receipt} onFileChangeAction={setReceipt} canEdit />
        </OperationForm>
        {refundedMinor > 0 ? (
          <p className="text-label text-text-secondary">
            {translate('refund.refunded', { amount: formatMinor(refundedMinor, item.row.currency, locale) })}
          </p>
        ) : null}
        {/* Figma 15:76568 «Refund»: a top border, padding-top 12, a full-width Ghost «record refund», the limit
            (caption) centred under it, gap 4 */}
        {canRefund ? (
          <div className="flex flex-col items-center gap-1 border-t border-border pt-3">
            <Button type="button" variant="ghost" className="self-stretch" onClick={() => setRefunding(true)}>
              <Undo2 aria-hidden className="size-5" />
              {translate('refund.submit')}
            </Button>
            <span className="text-caption text-text-tertiary">
              {translate('refund.limit', { amount: formatMinor(refundLeft, item.row.currency, locale) })}
            </span>
          </div>
        ) : null}
      </>
    )
  } else if (item) {
    const { amount } = summary(item)
    const transfer = item.transfer
    const rate = transfer
      ? impliedRate(transfer.fromAmountMinor, transfer.fromCurrency, transfer.toAmountMinor, transfer.toCurrency)
      : null
    const author = item.row.createdBy ? members[item.row.createdBy] : undefined
    // Figma 15:81303: the payee and the category under the amount
    const payee =
      [item.row.counterparty, categoryName(item.row.categoryId)].filter(Boolean).join(' · ') ||
      translateKinds(item.kind)
    const rows: [string, React.ReactNode][] = [
      ...(transfer
        ? ([
            [
              translate('form.details.from'),
              <span key="from">
                {accountName(transfer.fromAccountId)} ·{' '}
                <Amount minor={-transfer.fromAmountMinor} currency={transfer.fromCurrency} />
              </span>,
            ],
            [
              translate('form.details.to'),
              <span key="to">
                {accountName(transfer.toAccountId)} · +
                <Amount minor={transfer.toAmountMinor} currency={transfer.toCurrency} />
              </span>,
            ],
          ] as [string, React.ReactNode][])
        : ([[translate('form.details.account'), accountName(item.row.accountId)]] as [string, React.ReactNode][])),
      ...(transfer && rate && transfer.fromCurrency !== transfer.toCurrency
        ? ([[translate('form.details.rate'), formatRate(rate, locale)]] as [string, React.ReactNode][])
        : []),
      ...(transfer?.feeMinor
        ? ([
            [
              translate('form.details.fee'),
              <Amount key="fee" minor={-transfer.feeMinor} currency={transfer.fromCurrency} />,
            ],
          ] as [string, React.ReactNode][])
        : []),
      [
        translate('form.details.date'),
        formatter.dateTime(new Date(item.row.occurredAt), {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          timeZone,
        }),
      ],
      ...(item.row.note ? ([[translate('form.details.note'), item.row.note]] as [string, React.ReactNode][]) : []),
      ...(purchase
        ? ([
            [
              translate('form.details.purchase'),
              <Button
                key="purchase"
                type="button"
                variant="ghost"
                size="s"
                onClick={() =>
                  onOpenAction?.({
                    row: purchase,
                    transfer: null,
                    kind: 'expense',
                  })
                }
              >
                {translate('refund.purchase', { date: shortDate(purchase.occurredOn) })}
              </Button>,
            ],
          ] as [string, React.ReactNode][])
        : []),
      ...(author ? ([[translate('form.details.author'), author]] as [string, React.ReactNode][]) : []),
    ]

    // Figma 15:81303 (read-only): the amount (display number), the payee line (label, secondary), then DetailRows
    // (padding 12/0, a hairline under each, label on the left, body-medium value on the right)
    body = (
      <>
        <OperationSource operationId={item.row.id} />
        <p className="font-display text-number text-text-primary">
          {amount.plus ? '+' : null}
          <Amount minor={amount.minor} currency={amount.currency} kind={amount.tone} size="l" />
        </p>
        <p className="text-label text-text-secondary">{payee}</p>
        <dl className="flex flex-col">
          {rows.map(([label, value]) => (
            <div key={label} className="flex items-center justify-between gap-4 border-b border-border py-3">
              <dt className="flex-1 text-label text-text-secondary">{label}</dt>
              <dd className="text-right text-body font-medium text-text-primary">{value}</dd>
            </div>
          ))}
        </dl>
        <ReceiptField operationId={item.row.id} file={null} onFileChangeAction={setReceipt} canEdit={false} />
      </>
    )
  }

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChangeAction}
      title={title}
      footer={footer}
      headerAction={editMenu}
      // Figma: the operation and transfer forms are 640 wide (2:16567, 2:22322, 5:101464); delete and refund keep 480
      size={(mode === 'create' || mode === 'edit') && !refunding && !confirmingDelete ? 'lg' : 'md'}
    >
      {body}
      {conflict ? (
        <p
          role="alert"
          className="flex flex-wrap items-center gap-3 rounded-inner bg-warning-soft px-4 py-3 text-body text-warning-text"
        >
          <span className="flex-1">{translate('conflict')}</span>
          <Button type="button" size="s" variant="secondary" onClick={refresh}>
            {translate('refresh')}
          </Button>
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="text-body text-negative-text">
          {error}
        </p>
      ) : null}
    </Sheet>
  )
}
