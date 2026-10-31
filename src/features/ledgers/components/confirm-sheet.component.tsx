'use client'

import { Banner } from '@/components/ui/banner.component'
import { Button } from '@/components/ui/button.component'
import { Sheet } from '@/components/ui/sheet.component'

type ConfirmSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  body: string
  /** the blue line under the text: what can be undone */
  note?: string
  keepLabel: string
  confirmLabel: string
  onConfirm: () => void
  pending: boolean
  error: string | null
}

// Figma «Saldo» → Settings · Revoke access (Dialog 2:36442 / BottomSheet 2:45498): body text-body in
// text-secondary, an Info Banner, footer «Keep» secondary + red danger button
export function ConfirmSheet({
  open,
  onOpenChange,
  title,
  body,
  note,
  keepLabel,
  confirmLabel,
  onConfirm,
  pending,
  error,
}: ConfirmSheetProps) {
  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      footer={
        <>
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            {keepLabel}
          </Button>
          <Button type="button" variant="danger" disabled={pending} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className="text-body text-text-secondary">{body}</p>
      {note ? <Banner kind="info">{note}</Banner> : null}
      {error ? (
        <p role="alert" className="text-caption text-negative-text">
          {error}
        </p>
      ) : null}
    </Sheet>
  )
}
