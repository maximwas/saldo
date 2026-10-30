'use client'

import { useTranslations } from 'next-intl'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Amount } from '@/components/ui/amount.component'
import { Button } from '@/components/ui/button.component'
import { DatePicker } from '@/components/ui/date-picker.component'
import { FormField } from '@/components/ui/form-field.component'
import { MoneyInput } from '@/components/ui/money-input.component'
import { Sheet } from '@/components/ui/sheet.component'
import { notify } from '@/components/ui/toaster.component'
import { useToday } from '@/contexts/clock.context'
import { useZodResolver } from '@/lib/forms/zod-resolver.hook'
import { useDateLabel } from '../hooks/date-label.hook'
import { useSetSubscriptionPrice, useSubscription, useSubscriptionPayments } from '../hooks/subscriptions.hook'
import {
  type PriceFormInput,
  type PriceFormValues,
  priceFormSchema,
  toSetPriceInput,
} from '../schemas/subscription-form.schema'
import { nextPaymentOn, shownPrice } from '../utils/subscription-series.utils'
import { priceOn } from '../utils/subscriptions.utils'

const FORM_ID = 'subscription-price-form'

type PriceSheetProps = {
  subscriptionId: string
  onCloseAction: () => void
}

// Figma «Saldo» → Subscription card · Price change 5:107213: the price in force, the new amount and the date it starts on
// (the next payment by default). Only unpaid payments from that date take it; paid ones and earlier dates stay (§8).
export function PriceSheet({ subscriptionId, onCloseAction }: PriceSheetProps) {
  const translate = useTranslations('subscriptions.price')
  const today = useToday()
  const dateLabel = useDateLabel()
  const { data: subscription } = useSubscription(subscriptionId)
  const payments = useSubscriptionPayments(subscriptionId)
  const save = useSetSubscriptionPrice()
  const [priceId] = useState(() => crypto.randomUUID())
  // the first payment still open: a price change usually starts with the next charge, not with one already paid
  const firstOpenOn = payments.data?.find((payment) => payment.state !== 'paid' && payment.dueOn >= today)?.dueOn
  const form = useForm<PriceFormInput, unknown, PriceFormValues>({
    resolver: useZodResolver(priceFormSchema),
    defaultValues: {
      amountMinor: null,
      effectiveOn: firstOpenOn ?? (subscription && nextPaymentOn(subscription, today)) ?? today,
    },
  })

  if (!subscription) {
    return null
  }

  const current = priceOn(subscription.prices, today)
  const price = shownPrice(subscription, today)

  const submit = (values: PriceFormValues) =>
    save.mutate(toSetPriceInput(values, subscription, priceId), {
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
            {translate('cancel')}
          </Button>
          <Button type="submit" form={FORM_ID} disabled={save.isPending}>
            {translate('save')}
          </Button>
        </>
      }
    >
      <form id={FORM_ID} noValidate onSubmit={form.handleSubmit(submit)} className="flex flex-col gap-4">
        <p className="text-label text-text-secondary">
          {current ? (
            <>
              {translate('sheetCurrent', { date: dateLabel(current.effectiveOn, true) })}{' '}
              <Amount minor={current.amountMinor} currency={current.currency} className="text-label font-medium" />.{' '}
            </>
          ) : null}
          {translate('sheetHint')}
        </p>
        <FormField
          control={form.control}
          name="amountMinor"
          label={translate('amount')}
          render={(field) => (
            <MoneyInput
              ref={field.ref}
              name={field.name}
              value={field.value}
              onValueChange={field.onChange}
              onBlur={field.onBlur}
              currency={price.currency}
              placeholder="0,00"
              autoFocus
            />
          )}
        />
        <FormField
          control={form.control}
          name="effectiveOn"
          label={translate('effectiveOn')}
          hint={translate('effectiveHint')}
          render={(field) => (
            <DatePicker name={field.name} value={field.value} onValueChange={field.onChange} onBlur={field.onBlur} />
          )}
        />
      </form>
    </Sheet>
  )
}
