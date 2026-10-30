'use client'

import { useTranslations } from 'next-intl'
import { useState } from 'react'
import { Button } from '@/components/ui/button.component'
import { DatePicker } from '@/components/ui/date-picker.component'
import { Field } from '@/components/ui/field.component'
import { Sheet } from '@/components/ui/sheet.component'
import { notify } from '@/components/ui/toaster.component'
import type { CURRENCIES } from '@/constants/currencies.constants'
import { useLedgerStore } from '@/contexts/ledger.context'
import { toPgError } from '@/lib/supabase/pg-error.utils'
import type { ObligationRow } from '../api/obligations.api'
import { useUpdateObligation } from '../hooks/obligations.hook'

type ChangeDateSheetProps = {
  obligation: ObligationRow
  onCloseAction: () => void
}

// No Figma frame: the Confirm payment sheet 2:15014 with one date field. It moves due_on of this one obligation; the
// series date (occurrence_on), the sum and the source stay, so a subscription or a credit keeps its schedule (§18).
export function ChangeDateSheet({ obligation, onCloseAction }: ChangeDateSheetProps) {
  const translate = useTranslations('obligations')
  const translateErrors = useTranslations('errors')
  const ledgerId = useLedgerStore((ledger) => ledger.ledgerId)
  const update = useUpdateObligation()
  const [dueOn, setDueOn] = useState<string | null>(obligation.dueOn)

  const save = (next: string) =>
    update.mutate(
      {
        id: obligation.id,
        ledger_id: ledgerId,
        expectedVersion: obligation.version,
        title: obligation.title,
        direction: obligation.direction,
        planned_amount_minor: obligation.plannedMinor,
        currency: obligation.currency as (typeof CURRENCIES)[number],
        due_on: next,
        account_id: obligation.accountId,
        category_id: obligation.categoryId,
      },
      {
        onSuccess: () => {
          notify.success(translate('move.done'))
          onCloseAction()
        },
        onError: (error) => notify.error(translateErrors(`db.${toPgError(error as { code?: string }).kind}`)),
      },
    )

  return (
    <Sheet
      open
      onOpenChange={(open) => !open && onCloseAction()}
      title={translate('move.title')}
      footer={
        <>
          <Button variant="secondary" onClick={onCloseAction}>
            {translate('form.cancel')}
          </Button>
          <Button
            disabled={dueOn === null || dueOn === obligation.dueOn || update.isPending}
            onClick={() => dueOn && save(dueOn)}
          >
            {translate('form.save')}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <p className="text-caption text-text-secondary">{translate('move.text', { title: obligation.title })}</p>
        <Field label={translate('move.date')}>
          <DatePicker value={dueOn} onValueChange={setDueOn} />
        </Field>
      </div>
    </Sheet>
  )
}
