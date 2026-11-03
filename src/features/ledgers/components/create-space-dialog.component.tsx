'use client'

import { useTranslations } from 'next-intl'
import { type SubmitEvent, useId, useRef, useState } from 'react'
import { Button } from '@/components/ui/button.component'
import { Input } from '@/components/ui/input.component'
import { SegmentedControl } from '@/components/ui/segmented-control.component'
import { Sheet, SheetClose } from '@/components/ui/sheet.component'
import { CURRENCIES } from '@/constants/currencies.constants'
import { getBrowserSupabase } from '@/lib/supabase/browser-client'
import { useDbErrorText } from '@/lib/supabase/db-error-text.hook'
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

// Plan 1.17b. Figma has the "Create space" menu item (Space menu 2:40453) but no dialog frame: the shared Sheet
// (Dialog 2:10240 on desktop, BottomSheet 2:10281 on phones) with the login form's fields.
export function CreateSpaceDialog({ open, onOpenChange }: CreateSpaceDialogProps) {
  const translate = useTranslations('shell.space.create')
  const dbErrorText = useDbErrorText()
  const ids = {
    name: useId(),
    error: useId(),
    form: useId(),
  }
  const nameRef = useRef<HTMLInputElement>(null)
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
      setError(dbErrorText(caught))
    } finally {
      setIsPending(false)
    }
  }

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={translate('title')}
      initialFocus={nameRef}
      footer={
        <>
          <SheetClose>{translate('cancel')}</SheetClose>
          <Button type="submit" form={ids.form} disabled={isPending}>
            {translate('submit')}
          </Button>
        </>
      }
    >
      <form id={ids.form} onSubmit={submit} noValidate className="flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <label htmlFor={ids.name} className="text-label font-medium text-text-secondary">
            {translate('name')}
          </label>
          <Input
            id={ids.name}
            name="name"
            maxLength={60}
            ref={nameRef}
            required
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
      </form>
    </Sheet>
  )
}
