'use client'

import { useTranslations } from 'next-intl'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button.component'
import { DatePicker } from '@/components/ui/date-picker.component'
import { FormField } from '@/components/ui/form-field.component'
import { Select } from '@/components/ui/select.component'
import { Sheet } from '@/components/ui/sheet.component'
import { notify } from '@/components/ui/toaster.component'
import { useToday } from '@/contexts/clock.context'
import { useZodResolver } from '@/lib/forms/zod-resolver.hook'
import { useSubscription, useUpdateSubscription } from '../hooks/subscriptions.hook'
import {
  CANCEL_OUTCOMES,
  type CancelFormValues,
  cancelFormSchema,
  toCancelInput,
} from '../schemas/subscription-form.schema'
import { nextPaymentOn } from '../utils/subscription-series.utils'

const FORM_ID = 'subscription-cancel-form'

type CancelSheetProps = {
  subscriptionId: string
  onCloseAction: () => void
}

// Figma «Saldo» → Subscriptions · Cancel 5:98726 / Subscription card · Cancel subscription 5:108086: Saldo does not cancel the
// service; «what happened» tells the confirmed cancel (no more planned payments) from the intent (still planned),
// and the access date is kept apart from both (§8)
export function CancelSheet({ subscriptionId, onCloseAction }: CancelSheetProps) {
  const translate = useTranslations('subscriptions.cancel')
  const today = useToday()
  const { data: subscription } = useSubscription(subscriptionId)
  const update = useUpdateSubscription()
  const form = useForm<CancelFormValues>({
    resolver: useZodResolver(cancelFormSchema),
    defaultValues: {
      outcome: 'cancelled',
      accessEndsOn: subscription?.accessEndsOn ?? (subscription && nextPaymentOn(subscription, today)) ?? null,
    },
  })

  if (!subscription) {
    return null
  }

  const submit = (values: CancelFormValues) =>
    update.mutate(toCancelInput(values, subscription, today), {
      onSuccess: () => {
        notify.success(translate('saved'))
        onCloseAction()
      },
    })

  return (
    <Sheet
      open
      onOpenChange={(open) => {
        if (!open) {
          onCloseAction()
        }
      }}
      title={translate('sheetTitle', { name: subscription.name })}
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onCloseAction}>
            {translate('keep')}
          </Button>
          <Button type="submit" form={FORM_ID} variant="danger" disabled={update.isPending}>
            {translate('submit')}
          </Button>
        </>
      }
    >
      <form id={FORM_ID} noValidate onSubmit={form.handleSubmit(submit)} className="flex flex-col gap-4">
        <p className="text-label text-text-secondary">{translate('sheetHint', { name: subscription.name })}</p>
        <FormField
          control={form.control}
          name="accessEndsOn"
          label={translate('accessEndsOn')}
          hint={translate('accessHint')}
          render={(field) => (
            <DatePicker
              name={field.name}
              value={field.value}
              onValueChange={field.onChange}
              onBlur={field.onBlur}
              clearable
            />
          )}
        />
        <FormField
          control={form.control}
          name="outcome"
          label={translate('outcome')}
          render={(field) => (
            <Select
              name={field.name}
              value={field.value}
              onValueChange={field.onChange}
              onBlur={field.onBlur}
              options={CANCEL_OUTCOMES.map((value) => ({
                value,
                label: translate(`outcomes.${value}`),
              }))}
            />
          )}
        />
      </form>
    </Sheet>
  )
}
