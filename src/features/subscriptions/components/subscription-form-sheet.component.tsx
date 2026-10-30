'use client'

import { useTranslations } from 'next-intl'
import { useState } from 'react'
import { FormProvider, useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button.component'
import { Sheet } from '@/components/ui/sheet.component'
import { notify } from '@/components/ui/toaster.component'
import { useToday } from '@/contexts/clock.context'
import { useLedgerStore } from '@/contexts/ledger.context'
import { useZodResolver } from '@/lib/forms/zod-resolver.hook'
import { useCreateSubscription, useSubscriptionDefaults, useSubscriptionOptions } from '../hooks/subscriptions.hook'
import {
  newSubscriptionFormInput,
  type SubscriptionFormInput,
  type SubscriptionFormValues,
  subscriptionFormSchema,
  toCreateSubscriptionInput,
} from '../schemas/subscription-form.schema'
import { SubscriptionFields } from './subscription-fields.component'

const FORM_ID = 'subscription-form'

type SubscriptionFormSheetProps = {
  onCloseAction: () => void
}

// Figma «Saldo» → the subscription dialog 5:96222 (title, fields, Cancel + Save). Saving writes the row, its first price
// and its dates; the ids are made once per opened form, so a double click or a replay is still one subscription.
export function SubscriptionFormSheet({ onCloseAction }: SubscriptionFormSheetProps) {
  const translate = useTranslations('subscriptions.form')
  const options = useSubscriptionOptions()
  const defaults = useSubscriptionDefaults()
  const create = useCreateSubscription()

  return (
    <Sheet
      open
      onOpenChange={(open) => {
        if (!open) {
          onCloseAction()
        }
      }}
      title={translate('createTitle')}
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onCloseAction}>
            {translate('cancel')}
          </Button>
          <Button type="submit" form={FORM_ID} disabled={create.isPending || !options.data}>
            {translate('save')}
          </Button>
        </>
      }
    >
      {options.data && defaults.data ? (
        <CreateForm
          defaultAccountId={
            options.data.accounts.find((account) => account.id === defaults.data.defaults.account_id)?.id ??
            options.data.accounts[0]?.id ??
            null
          }
          onSavedAction={onCloseAction}
        />
      ) : (
        <div aria-busy className="h-96 rounded-md bg-subtle" />
      )}
    </Sheet>
  )
}

type CreateFormProps = {
  defaultAccountId: string | null
  onSavedAction: () => void
}

function CreateForm({ defaultAccountId, onSavedAction }: CreateFormProps) {
  const translate = useTranslations('subscriptions.form')
  const today = useToday()
  const ledgerId = useLedgerStore((ledger) => ledger.ledgerId)
  const baseCurrency = useLedgerStore((ledger) => ledger.baseCurrency)
  const create = useCreateSubscription()
  const [ids] = useState(() => ({
    id: crypto.randomUUID(),
    priceId: crypto.randomUUID(),
  }))
  const form = useForm<SubscriptionFormInput, unknown, SubscriptionFormValues>({
    resolver: useZodResolver(subscriptionFormSchema),
    defaultValues: newSubscriptionFormInput({
      today,
      currency: baseCurrency,
      accountId: defaultAccountId,
    }),
  })

  const submit = (values: SubscriptionFormValues) =>
    create.mutate(
      toCreateSubscriptionInput(values, {
        ...ids,
        ledgerId,
        today,
      }),
      {
        onSuccess: () => {
          notify.success(translate('saved'))
          onSavedAction()
        },
      },
    )

  return (
    <FormProvider {...form}>
      <form id={FORM_ID} noValidate onSubmit={form.handleSubmit(submit)}>
        <SubscriptionFields mode="create" />
      </form>
    </FormProvider>
  )
}
