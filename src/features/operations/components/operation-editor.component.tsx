'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { TriangleAlert } from 'lucide-react'
import { useFormatter, useLocale, useTranslations } from 'next-intl'
import { useState } from 'react'
import { Amount } from '@/components/ui/amount.component'
import { Button } from '@/components/ui/button.component'
import { SegmentedControl } from '@/components/ui/segmented-control.component'
import { Sheet } from '@/components/ui/sheet.component'
import { notify } from '@/components/ui/toaster.component'
import { useClock } from '@/contexts/clock.context'
import { useCanWrite, useLedger } from '@/contexts/ledger.context'
import { formatMinor, fromMinor } from '@/lib/money/money.utils'
import { toPgError } from '@/lib/supabase/pg-error.utils'
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
import { displayAmount } from '../utils/operation-display.utils'
import { formatRate, impliedRate } from '../utils/rate.utils'
import { OperationForm } from './operation-form.component'
import { ReceiptField } from './receipt-field.component'
import { TransferForm } from './transfer-form.component'

export type EditorTarget =
  | {
      mode: 'create'
      kind: AddKind
      /** a duplicate starts from the values of another operation */
      defaults?: Partial<OperationFormValues>
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
  onDuplicateAction?: (defaults: Partial<OperationFormValues>) => void
}

const FORM_ID = 'operation-editor-form'

const toFormValues = (item: OperationItem): Partial<OperationFormValues> => ({
  kind: item.row.kind as OperationFormValues['kind'],
  direction: item.row.direction,
  amount: fromMinor(item.row.amountMinor, item.row.currency),
  currency: item.row.currency as OperationFormValues['currency'],
  accountId: item.row.accountId,
  categoryId: item.row.categoryId,
  occurredOn: item.row.occurredOn,
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
}: OperationEditorProps) {
  const translate = useTranslations('operations')
  const translateErrors = useTranslations('errors.db')
  const translateKinds = useTranslations('operations.kinds')
  const locale = useLocale()
  const formatter = useFormatter()
  const clock = useClock()
  const { ledgerId } = useLedger()
  const canWrite = useCanWrite()
  const queryClient = useQueryClient()
  const options = useQuery(operationQueries.options(ledgerId))
  const [newId] = useState(() => crypto.randomUUID())
  const [kind, setKind] = useState<AddKind>(target.mode === 'create' ? target.kind : 'expense')
  const [receipt, setReceipt] = useState<File | null>(null)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
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
  const mode = target.mode === 'create' ? 'create' : editable ? 'edit' : 'details'
  const accounts = options.data?.accounts ?? []
  const categories = options.data?.categories ?? []
  const accountName = (id: string) => accounts.find((account) => account.id === id)?.name ?? '…'
  const categoryName = (id: string | null) => categories.find((category) => category.id === id)?.name ?? null
  const title =
    confirmingDelete && item
      ? translate(item.kind === 'transfer' ? 'form.deleteTransferTitle' : 'form.deleteTitle')
      : mode === 'create'
        ? translate(kind === 'transfer' ? 'form.transferTitle' : 'form.newTitle')
        : translate(item?.kind === 'transfer' ? 'form.transferTitle' : 'form.editTitle')

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
        notify.success(translate('toast.updated'))

        return
      }

      await createOperation.mutateAsync(
        toCreateOperationInput(values, clock, {
          id: newId,
          ledgerId,
        }),
      )
      await uploadPending(newId)
      notify.success(translate('toast.created'))
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
      notify.success(translate('toast.transferCreated'))
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
      notify.success(translate('toast.deleted'))
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

  if (confirmingDelete) {
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
    footer = (
      <>
        <Button type="button" variant="danger" disabled={pending} onClick={() => setConfirmingDelete(true)}>
          {translate('form.delete')}
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={pending}
          onClick={() => onDuplicateAction?.(toFormValues(item))}
        >
          {translate('form.duplicate')}
        </Button>
        <Button type="submit" form={FORM_ID} disabled={pending || options.isPending || conflict}>
          {translate('form.save')}
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

  const dateLabel = (date: string) =>
    formatter.dateTime(new Date(`${date}T12:00:00Z`), {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
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

  if (confirmingDelete && item) {
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
          label={translate('add.typeLabel')}
          options={ADD_KINDS.map((value) => ({
            value,
            label: translate(`add.${value}`),
          }))}
          value={kind}
          onValueChange={(next) => {
            setKind(next)
            onKindChangeAction?.(next)
          }}
        />
        {options.isPending ? (
          <div aria-busy className="h-64 rounded-md bg-subtle" />
        ) : kind === 'transfer' ? (
          <TransferForm
            formId={FORM_ID}
            accounts={accounts}
            categories={categories}
            rates={options.data?.rates ?? []}
            onSubmitAction={saveTransfer}
          />
        ) : (
          <OperationForm
            formId={FORM_ID}
            kind={kind}
            accounts={accounts}
            categories={categories}
            defaults={target.mode === 'create' ? target.defaults : undefined}
            onSubmitAction={saveOperation}
          >
            <ReceiptField operationId={null} file={receipt} onFileChangeAction={setReceipt} canEdit />
          </OperationForm>
        )}
      </>
    )
  } else if (mode === 'edit' && item) {
    body = options.isPending ? (
      <div aria-busy className="h-64 rounded-md bg-subtle" />
    ) : (
      <OperationForm
        formId={FORM_ID}
        kind={item.kind as 'expense' | 'income'}
        accounts={accounts}
        categories={categories}
        defaults={toFormValues(item)}
        onSubmitAction={saveOperation}
      >
        <ReceiptField operationId={item.row.id} file={receipt} onFileChangeAction={setReceipt} canEdit />
      </OperationForm>
    )
  } else if (item) {
    const { amount } = summary(item)
    const transfer = item.transfer
    const rate = transfer
      ? impliedRate(transfer.fromAmountMinor, transfer.fromCurrency, transfer.toAmountMinor, transfer.toCurrency)
      : null
    const rows: [string, React.ReactNode][] = [
      [translate('form.details.type'), translateKinds(item.kind)],
      transfer
        ? [
            translate('form.details.from'),
            <span key="from">
              {accountName(transfer.fromAccountId)} ·{' '}
              <Amount minor={-transfer.fromAmountMinor} currency={transfer.fromCurrency} />
            </span>,
          ]
        : [
            translate('form.details.amount'),
            <span key="amount">
              {amount.plus ? '+' : null}
              <Amount minor={amount.minor} currency={amount.currency} kind={amount.tone} />
            </span>,
          ],
      transfer
        ? [
            translate('form.details.to'),
            <span key="to">
              {accountName(transfer.toAccountId)} · +
              <Amount minor={transfer.toAmountMinor} currency={transfer.toCurrency} />
            </span>,
          ]
        : [translate('form.details.account'), accountName(item.row.accountId)],
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
      ...(categoryName(item.row.categoryId)
        ? ([[translate('form.details.category'), categoryName(item.row.categoryId)]] as [string, React.ReactNode][])
        : []),
      [translate('form.details.date'), dateLabel(item.row.occurredOn)],
      ...(item.row.counterparty
        ? ([[translate('form.details.counterparty'), item.row.counterparty]] as [string, React.ReactNode][])
        : []),
      ...(item.row.note ? ([[translate('form.details.note'), item.row.note]] as [string, React.ReactNode][]) : []),
    ]

    body = (
      <>
        <dl className="flex flex-col gap-3">
          {rows.map(([label, value]) => (
            <div key={label} className="flex items-baseline justify-between gap-4">
              <dt className="text-label text-text-secondary">{label}</dt>
              <dd className="text-body font-medium text-text-primary">{value}</dd>
            </div>
          ))}
        </dl>
        <ReceiptField operationId={item.row.id} file={null} onFileChangeAction={setReceipt} canEdit={false} />
      </>
    )
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChangeAction} title={title} footer={footer}>
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
