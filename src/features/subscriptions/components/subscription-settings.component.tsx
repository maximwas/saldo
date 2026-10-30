'use client'

import { useTranslations } from 'next-intl'
import { useState } from 'react'
import { FormProvider, useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button.component'
import { notify } from '@/components/ui/toaster.component'
import { useToday } from '@/contexts/clock.context'
import { useZodResolver } from '@/lib/forms/zod-resolver.hook'
import type { SubscriptionView } from '../api/subscriptions.api'
import { useSubscription, useUpdateSubscription } from '../hooks/subscriptions.hook'
import {
  type SubscriptionFormInput,
  type SubscriptionFormValues,
  subscriptionFormInput,
  subscriptionFormSchema,
  toStatusChangeInput,
  toUpdateSubscriptionInput,
} from '../schemas/subscription-form.schema'
import { ConfirmStatusSheet } from './confirm-status-sheet.component'
import { SubscriptionFields } from './subscription-fields.component'

type SettingsFormProps = {
  subscription: SubscriptionView
}

// Figma «Saldo» → Subscription card · Settings 5:105808 / 5:106682: the subscription's own rules; they win over the
// space defaults (§8). Saving moves only the unpaid dates from today. Reminders and calendar join in phase 3.
function SettingsForm({ subscription }: SettingsFormProps) {
  const translate = useTranslations('subscriptions.form')
  const today = useToday()
  const update = useUpdateSubscription()
  const form = useForm<SubscriptionFormInput, unknown, SubscriptionFormValues>({
    resolver: useZodResolver(subscriptionFormSchema),
    defaultValues: subscriptionFormInput(subscription),
  })

  const submit = (values: SubscriptionFormValues) =>
    update.mutate(toUpdateSubscriptionInput(values, subscription, today), {
      onSuccess: () => notify.success(translate('saved')),
    })

  return (
    <FormProvider {...form}>
      <form
        noValidate
        onSubmit={form.handleSubmit(submit)}
        className="flex flex-col gap-5 rounded-card bg-card p-5 shadow-card lg:p-6"
      >
        <h2 className="text-card-title text-text-primary">{translate('settingsTitle')}</h2>
        <SubscriptionFields mode="edit" />
        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={() => form.reset()}>
            {translate('cancel')}
          </Button>
          <Button type="submit" disabled={update.isPending}>
            {translate('save')}
          </Button>
        </div>
      </form>
    </FormProvider>
  )
}

function ArchiveCard({ subscription }: SettingsFormProps) {
  const translate = useTranslations('subscriptions.archive')
  const today = useToday()
  const update = useUpdateSubscription()
  const [confirming, setConfirming] = useState(false)

  const restore = () =>
    update.mutate(toStatusChangeInput(subscription, { archivedAt: null }, today), {
      onSuccess: () => notify.success(translate('restored')),
    })

  return (
    <section className="flex flex-col gap-3 rounded-card bg-card p-5 shadow-card lg:flex-row lg:items-center lg:justify-between lg:p-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-body font-semibold text-text-primary">
          {translate(subscription.archivedAt ? 'restoreTitle' : 'cardTitle')}
        </h2>
        <p className="text-label text-text-secondary">
          {translate(subscription.archivedAt ? 'restoreHint' : 'cardHint', { name: subscription.name })}
        </p>
      </div>
      {subscription.archivedAt ? (
        <Button variant="secondary" onClick={restore} disabled={update.isPending}>
          {translate('restore')}
        </Button>
      ) : (
        <Button variant="secondary" onClick={() => setConfirming(true)}>
          {translate('open')}
        </Button>
      )}
      {confirming ? (
        <ConfirmStatusSheet
          subscriptionId={subscription.id}
          kind="archive"
          onCloseAction={() => setConfirming(false)}
        />
      ) : null}
    </section>
  )
}

type SubscriptionSettingsProps = {
  subscriptionId: string
}

export function SubscriptionSettings({ subscriptionId }: SubscriptionSettingsProps) {
  const { data: subscription } = useSubscription(subscriptionId)

  if (!subscription) {
    return null
  }

  return (
    <>
      {/* a new version from someone else re-mounts the form with their values instead of keeping stale ones */}
      <SettingsForm key={subscription.version} subscription={subscription} />
      <ArchiveCard subscription={subscription} />
    </>
  )
}
