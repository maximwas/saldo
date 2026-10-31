'use client'

import { useFormatter, useLocale, useTranslations } from 'next-intl'
import { useState } from 'react'
import { Button } from '@/components/ui/button.component'
import { Sheet } from '@/components/ui/sheet.component'
import { Switch } from '@/components/ui/switch.component'
import { notify } from '@/components/ui/toaster.component'
import { useLedgerStore } from '@/contexts/ledger.context'
import { useMemberNames } from '@/lib/members/member-names.hook'
import { formatMinor } from '@/lib/money/money.utils'
import { toPgError } from '@/lib/supabase/pg-error.utils'
import type { ObligationRow } from '../api/obligations.api'
import { useDeleteObligationPayment, useObligationOptions, useObligationPayments } from '../hooks/obligations.hook'
import { OperationLine } from './operation-line.component'

type CancelPaymentSheetProps = {
  obligation: ObligationRow
  onClose: () => void
}

// Figma «Saldo» → Cancel payment 5:91722 / 5:93021: what returns to the plan and what happens to the balance, the
// operation that goes with the payment (label-medium + caption hint + a ListItem), footer Keep + Danger Cancel payment.
// Several partial payments: the newest goes first, the person repeats it for the next one.
export function CancelPaymentSheet({ obligation, onClose }: CancelPaymentSheetProps) {
  const translate = useTranslations('obligations')
  const translateErrors = useTranslations('errors')
  const format = useFormatter()
  const locale = useLocale()
  const names = useMemberNames()
  const timeZone = useLedgerStore((ledger) => ledger.timeZone)
  const options = useObligationOptions()
  const payments = useObligationPayments(obligation.id, true)
  const remove = useDeleteObligationPayment()
  const [deleteOperation, setDeleteOperation] = useState(true)
  const payment = payments.data?.[0]
  const operation = payment?.operation ?? null
  const accountName = options.data?.accounts.find((item) => item.id === operation?.accountId)?.name ?? ''
  const shortDate = (isoDate: string) =>
    format.dateTime(new Date(`${isoDate}T12:00:00Z`), {
      timeZone: 'UTC',
      day: '2-digit',
      month: '2-digit',
    })
  const confirmer = obligation.confirmedBy ? names[obligation.confirmedBy] : null
  const confirmedAt = obligation.confirmedAt
    ? format.dateTime(new Date(obligation.confirmedAt), {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        timeZone,
      })
    : null
  const isCredit = obligation.sourceType === 'credit' && obligation.sequenceNo !== null
  const textKey = isCredit ? 'cancelPayment.textCredit' : 'cancelPayment.text'

  const cancel = () => {
    if (!payment) {
      return
    }

    remove.mutate(
      {
        paymentId: payment.id,
        deleteOperation,
      },
      {
        onSuccess: () => {
          notify.success(translate('cancelPayment.done'))
          onClose()
        },
        onError: (error) => notify.error(translateErrors(`db.${toPgError(error as { code?: string }).kind}`)),
      },
    )
  }

  return (
    <Sheet
      open
      onOpenChange={(open) => !open && onClose()}
      title={translate('cancelPayment.title')}
      footer={
        <>
          <Button variant="secondary" type="button" onClick={onClose}>
            {translate('cancelPayment.keep')}
          </Button>
          <Button variant="danger" type="button" disabled={!payment || remove.isPending} onClick={cancel}>
            {translate('cancelPayment.confirm')}
          </Button>
        </>
      }
    >
      <p className="text-label text-text-secondary">
        {translate(textKey, {
          title: obligation.title,
          number: obligation.sequenceNo ?? 0,
          total: obligation.installmentTotal ?? obligation.sequenceNo ?? 0,
          date: shortDate(obligation.dueOn),
          account: accountName,
          direction: obligation.direction,
          amount: payment ? formatMinor(payment.amountMinor, obligation.currency, locale) : '',
        })}
      </p>
      {payments.data?.length === 0 && (
        <p className="text-caption text-text-tertiary">{translate('cancelPayment.empty')}</p>
      )}
      <Switch
        label={translate('cancelPayment.deleteOperation')}
        checked={deleteOperation}
        onCheckedChange={setDeleteOperation}
      />
      {payment && operation && (
        <section className="flex flex-col gap-1">
          <h3 className="text-label font-medium text-text-secondary">{translate('cancelPayment.operation')}</h3>
          <p className="text-caption text-text-tertiary">
            {confirmer && confirmedAt
              ? `${translate('confirmedBy', {
                  name: confirmer,
                  date: confirmedAt,
                })}. `
              : ''}
            {translate('cancelPayment.operationHint')}
          </p>
          <ul>
            <OperationLine
              title={obligation.title}
              subtitle={`${shortDate(operation.occurredOn)} · ${accountName}`}
              minor={obligation.direction === 'out' ? -operation.amountMinor : operation.amountMinor}
              currency={operation.currency}
            />
          </ul>
        </section>
      )}
    </Sheet>
  )
}
