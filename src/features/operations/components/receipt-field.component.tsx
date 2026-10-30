'use client'

import { useQuery } from '@tanstack/react-query'
import { FileText, Paperclip, X } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useRef } from 'react'
import { Button } from '@/components/ui/button.component'
import { notify } from '@/components/ui/toaster.component'
import { useLedgerStore } from '@/contexts/ledger.context'
import { useDeleteReceipt } from '../api/operations.mutations'
import { operationQueries } from '../api/operations.queries'
import type { Receipt } from '../operations.types'
import { isReceiptType, RECEIPT_MAX_BYTES } from '../utils/receipt-compress.utils'

type ReceiptFieldProps = {
  /** the operation whose saved receipts are shown; null while it is being created */
  operationId: string | null
  /** the receipt picked now, uploaded after the operation is saved */
  file: File | null
  onFileChangeAction: (file: File | null) => void
  /** false: only the saved receipts are shown (a viewer, a read-only operation) */
  canEdit: boolean
}

// Figma Saldo file → New operation 2:16567, frame "Receipt": a secondary "Add receipt" button with a paperclip and a
// caption «Photo or PDF, optional». Saved receipts show as thumbnails (signed URL, 5 minutes) with a remove button.
export function ReceiptField({ operationId, file, onFileChangeAction, canEdit }: ReceiptFieldProps) {
  const translate = useTranslations('operations.form')
  const ledgerId = useLedgerStore((ledger) => ledger.ledgerId)
  const input = useRef<HTMLInputElement>(null)
  const saved = useQuery({
    ...operationQueries.receipts(ledgerId, operationId ?? ''),
    enabled: operationId !== null,
  })
  const remove = useDeleteReceipt()

  function pick(next: File | undefined) {
    if (!next) {
      return
    }

    if (!isReceiptType(next.type)) {
      notify.error(translate('receiptBadType'))

      return
    }

    if (next.size > RECEIPT_MAX_BYTES) {
      notify.error(translate('receiptTooBig'))

      return
    }

    onFileChangeAction(next)
  }

  return (
    <div className="flex flex-col gap-3">
      {saved.data && saved.data.length > 0 ? (
        <ul className="flex flex-wrap gap-3">
          {saved.data.map((receipt) => (
            <li key={receipt.id} className="relative">
              <ReceiptPreview receipt={receipt} />
              {canEdit ? (
                <button
                  type="button"
                  aria-label={translate('receiptDelete')}
                  disabled={remove.isPending}
                  onClick={() => remove.mutate(receipt)}
                  className="absolute -top-2 -right-2 flex size-6 cursor-pointer items-center justify-center rounded-full border border-border bg-card text-text-secondary outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <X aria-hidden size={14} />
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
      {canEdit ? (
        <div className="flex flex-wrap items-center gap-3">
          <input
            ref={input}
            type="file"
            accept="image/*,application/pdf"
            hidden
            data-testid="receipt-input"
            onChange={(event) => {
              pick(event.target.files?.[0])
              event.target.value = ''
            }}
          />
          <Button type="button" variant="secondary" onClick={() => input.current?.click()}>
            <Paperclip aria-hidden size={20} />
            {translate('addReceipt')}
          </Button>
          {file ? (
            <span className="flex min-w-0 items-center gap-1 text-label text-text-primary">
              <span className="truncate">{file.name}</span>
              <button
                type="button"
                aria-label={translate('receiptRemove')}
                onClick={() => onFileChangeAction(null)}
                className="flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-full text-text-secondary outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <X aria-hidden size={14} />
              </button>
            </span>
          ) : (
            <span className="text-caption text-text-tertiary">{translate('receiptHint')}</span>
          )}
        </div>
      ) : null}
    </div>
  )
}

// a PDF opens in a new tab; a photo shows as a thumbnail; nothing while its signed URL is missing
function ReceiptPreview({ receipt }: { receipt: Receipt }) {
  const translate = useTranslations('operations.form')

  if (receipt.mime === 'application/pdf') {
    return (
      <a
        href={receipt.url ?? undefined}
        target="_blank"
        rel="noreferrer"
        className="flex size-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-md border border-border bg-subtle text-caption text-text-secondary"
      >
        <FileText aria-hidden size={20} />
        {translate('receiptOpenPdf')}
      </a>
    )
  }

  if (!receipt.url) {
    return null
  }

  return (
    <a href={receipt.url} target="_blank" rel="noreferrer" className="block cursor-pointer">
      {/* biome-ignore lint/performance/noImgElement: a signed Storage URL, not an optimised next/image source */}
      <img
        src={receipt.url}
        alt={translate('receiptImageAlt')}
        className="size-20 rounded-md border border-border object-cover"
      />
    </a>
  )
}
