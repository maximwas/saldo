'use client'

import { useTranslations } from 'next-intl'
import { useState } from 'react'
import { Amount } from '@/components/ui/amount.component'
import { Button } from '@/components/ui/button.component'
import { Sheet } from '@/components/ui/sheet.component'
import { Switch } from '@/components/ui/switch.component'
import { notify } from '@/components/ui/toaster.component'
import { toPgError } from '@/lib/supabase/pg-error.utils'
import type { ObligationRow } from '../api/obligations.api'
import { useDeleteObligationPayment, useObligationPayments } from '../hooks/obligations.hook'

type CancelPaymentSheetProps = {
  obligation: ObligationRow
  onClose: () => void
}

// Figma «Saldo» → Cancel payment 5:91722 / 5:93021: what returns to the plan, the operation that goes with it,
// footer Keep + danger Cancel payment. Several partial payments: each one is cancelled on its own.
export function CancelPaymentSheet({ obligation, onClose }: CancelPaymentSheetProps) {
  const translate = useTranslations('obligations')
  const translateErrors = useTranslations('errors')
  const payments = useObligationPayments(obligation.id, true)
  const remove = useDeleteObligationPayment()
  const [deleteOperation, setDeleteOperation] = useState(true)

  const cancel = (paymentId: string) =>
    remove.mutate(
      {
        paymentId,
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

  return (
    <Sheet
      open
      onOpenChange={(open) => !open && onClose()}
      title={translate('cancelPayment.title')}
      footer={
        <Button variant="secondary" type="button" onClick={onClose}>
          {translate('cancelPayment.keep')}
        </Button>
      }
    >
      <p className="text-body text-text-secondary">{translate('cancelPayment.text', { title: obligation.title })}</p>
      <Switch
        label={translate('cancelPayment.deleteOperation')}
        checked={deleteOperation}
        onCheckedChange={setDeleteOperation}
      />
      <p className="-mt-3 text-caption text-text-tertiary">{translate('cancelPayment.deleteOperationHint')}</p>
      <h3 className="text-label font-medium text-text-primary">{translate('cancelPayment.payments')}</h3>
      {payments.data?.length === 0 && (
        <p className="text-caption text-text-tertiary">{translate('cancelPayment.empty')}</p>
      )}
      <ul className="flex flex-col gap-3">
        {(payments.data ?? []).map((payment) => (
          <li key={payment.id} className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 flex-col">
              <Amount minor={payment.amountMinor} currency={obligation.currency} />
              <span className="text-caption text-text-secondary">{payment.operation?.occurredOn}</span>
            </div>
            <Button
              size="s"
              variant="danger"
              type="button"
              disabled={remove.isPending}
              onClick={() => cancel(payment.id)}
            >
              {translate('cancelPayment.confirm')}
            </Button>
          </li>
        ))}
      </ul>
    </Sheet>
  )
}
