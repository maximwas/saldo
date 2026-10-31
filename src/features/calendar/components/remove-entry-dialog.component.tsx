'use client'

import { useFormatter, useLocale, useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button.component'
import { Sheet } from '@/components/ui/sheet.component'
import { notify } from '@/components/ui/toaster.component'
import { useLedger } from '@/contexts/ledger.context'
import { formatMinor } from '@/lib/money/money.utils'
import type { CalendarEntry } from '../api/calendar.api'
import { useCancelPlanEntry } from '../hooks/calendar.hook'
import { dayDate } from '../utils/calendar.utils'

type RemoveEntryDialogProps = {
  entry: CalendarEntry
  onCloseAction: () => void
}

// Figma «Saldo» → Calendar · Remove entry 2:73874 (Dialog 2:75019): «Remove the entry <name> DD.MM?», what disappears,
// what stays, footer Cancel + Danger «Remove entry». Only a plan with no payment gets it.
export function RemoveEntryDialog({ entry, onCloseAction }: RemoveEntryDialogProps) {
  const translate = useTranslations('calendar.remove')
  const format = useFormatter()
  const locale = useLocale()
  const { ledgerId } = useLedger()
  const cancel = useCancelPlanEntry()
  const title = entry.title ?? ''
  const date = format.dateTime(dayDate(entry.day), {
    timeZone: 'UTC',
    day: '2-digit',
    month: '2-digit',
  })
  const amount = entry.amountMinor === null ? null : formatMinor(entry.amountMinor, entry.currency, locale)

  const remove = () => {
    if (!entry.obligationId) {
      return
    }

    cancel.mutate(
      {
        ledgerId,
        obligationId: entry.obligationId,
      },
      {
        onSuccess: () => {
          notify.success(translate('done'))
          onCloseAction()
        },
      },
    )
  }

  return (
    <Sheet
      open
      onOpenChange={(open) => !open && onCloseAction()}
      size="md"
      title={translate('title', {
        name: title,
        date,
      })}
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onCloseAction}>
            {translate('keep')}
          </Button>
          <Button type="button" variant="danger" disabled={cancel.isPending} onClick={remove}>
            {translate('confirm')}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <p className="text-body text-text-primary">
          {translate(amount === null ? 'consequencesNoAmount' : 'consequences', {
            amount: amount ?? '',
            date,
          })}
        </p>
        <p className="text-label text-text-secondary">
          {translate('details', {
            source: entry.sourceType === 'subscription' ? 'subscription' : 'other',
            name: title,
          })}
        </p>
      </div>
    </Sheet>
  )
}
