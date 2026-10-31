'use client'

import { useTranslations } from 'next-intl'
import { useState } from 'react'
import { Button } from '@/components/ui/button.component'
import { DatePicker } from '@/components/ui/date-picker.component'
import { Field } from '@/components/ui/field.component'
import { Sheet } from '@/components/ui/sheet.component'
import { notify } from '@/components/ui/toaster.component'
import { useLedgerStore } from '@/contexts/ledger.context'
import { toPgError } from '@/lib/supabase/pg-error.utils'
import { useSetIncomeDate } from '../hooks/overview.hook'

type IncomeDateSheetProps = {
  untilOn: string | null
  ledgerVersion: number
  onClose: () => void
}

// «Change» in the hero (plan 1.12): ledgers.next_income_on. No Figma frame for it yet, built from Sheet + DatePicker.
// The expected income amount has no column in the schema, so only the date is edited here.
export function IncomeDateSheet({ untilOn, ledgerVersion, onClose }: IncomeDateSheetProps) {
  const translate = useTranslations('overview')
  const translateErrors = useTranslations('errors')
  const ledgerId = useLedgerStore((ledger) => ledger.ledgerId)
  const save = useSetIncomeDate()
  const [value, setValue] = useState<string | null>(untilOn)

  return (
    <Sheet
      open
      onOpenChange={(open) => !open && onClose()}
      title={translate('incomeDate.title')}
      footer={
        <>
          <Button variant="secondary" type="button" onClick={onClose}>
            {translate('incomeDate.cancel')}
          </Button>
          <Button
            disabled={save.isPending}
            onClick={() =>
              save.mutate(
                {
                  ledgerId,
                  nextIncomeOn: value,
                  expectedVersion: ledgerVersion,
                },
                {
                  onSuccess: () => {
                    notify.success(translate('incomeDate.saved'))
                    onClose()
                  },
                  onError: (error) => notify.error(translateErrors(`db.${toPgError(error as { code?: string }).kind}`)),
                },
              )
            }
          >
            {translate('incomeDate.save')}
          </Button>
        </>
      }
    >
      <p className="text-body text-text-secondary">{translate('incomeDate.text')}</p>
      <Field label={translate('incomeDate.label')}>
        <DatePicker value={value} onValueChange={setValue} clearable />
      </Field>
    </Sheet>
  )
}
