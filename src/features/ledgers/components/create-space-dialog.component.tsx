'use client'

import { Dialog } from '@base-ui/react/dialog'
import { useTranslations } from 'next-intl'
import { type SubmitEvent, useId, useState } from 'react'
import { Button } from '@/components/ui/button.component'
import { Input } from '@/components/ui/input.component'
import { SegmentedControl } from '@/components/ui/segmented-control.component'
import { CURRENCIES } from '@/constants/currencies.constants'
import { getBrowserSupabase } from '@/lib/supabase/browser-client'
import { toPgError } from '@/lib/supabase/pg-error.utils'
import { switchLedger } from '../api/ledgers.actions'
import { createLedger } from '../api/ledgers.api'
import { createLedgerSchema } from '../schemas/ledger.schema'

type Currency = (typeof CURRENCIES)[number]

type CreateSpaceDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const CURRENCY_OPTIONS = CURRENCIES.map((value) => ({
  value,
  label: value,
}))

// Plan 1.17b. Figma has the "Create space" menu item (Space menu 2:40453) but no dialog frame: this one takes the
// card tokens of the invite dialog (radius card, shadow float, padding 24) and the login form's fields.
export function CreateSpaceDialog({ open, onOpenChange }: CreateSpaceDialogProps) {
  const translate = useTranslations('shell.space.create')
  const translateError = useTranslations('errors.db')
  const ids = {
    name: useId(),
    error: useId(),
  }
  // one id per attempt: a double submit or a retry replays the same create_ledger instead of making two spaces
  const [ledgerId, setLedgerId] = useState(() => crypto.randomUUID())
  const [currency, setCurrency] = useState<Currency>('UAH')
  const [error, setError] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)

  async function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    const parsed = createLedgerSchema.safeParse({
      id: ledgerId,
      name: new FormData(event.currentTarget).get('name'),
      baseCurrency: currency,
    })

    if (!parsed.success) {
      setError(translate('nameRequired'))

      return
    }

    setIsPending(true)
    setError(null)

    try {
      await createLedger(getBrowserSupabase(), parsed.data)
      await switchLedger(parsed.data.id)
      onOpenChange(false)
      setLedgerId(crypto.randomUUID())
    } catch (caught) {
      setError(translateError(toPgError(caught as { code?: string }).kind))
    } finally {
      setIsPending(false)
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-text-primary/40" />
        <Dialog.Popup className="fixed inset-x-5 top-1/2 z-50 mx-auto flex max-w-110 -translate-y-1/2 flex-col gap-5 rounded-card bg-card p-6 shadow-float outline-none">
          <Dialog.Title className="text-card-title text-text-primary">{translate('title')}</Dialog.Title>
          <form onSubmit={submit} className="flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <label htmlFor={ids.name} className="text-label font-medium text-text-secondary">
                {translate('name')}
              </label>
              <Input
                id={ids.name}
                name="name"
                maxLength={60}
                required
                autoFocus
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? ids.error : undefined}
              />
              {error ? (
                <p id={ids.error} className="text-caption text-negative-text">
                  {error}
                </p>
              ) : null}
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-label font-medium text-text-secondary">{translate('currency')}</span>
              <SegmentedControl
                label={translate('currency')}
                options={CURRENCY_OPTIONS}
                value={currency}
                onValueChange={setCurrency}
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
                {translate('cancel')}
              </Button>
              <Button type="submit" disabled={isPending}>
                {translate('submit')}
              </Button>
            </div>
          </form>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
