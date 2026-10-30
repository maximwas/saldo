'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslations } from 'next-intl'
import { useForm } from 'react-hook-form'
import type { z } from 'zod'
import { Button } from '@/components/ui/button.component'
import { DatePicker } from '@/components/ui/date-picker.component'
import { FormField } from '@/components/ui/form-field.component'
import { Input } from '@/components/ui/input.component'
import { MoneyInput } from '@/components/ui/money-input.component'
import { SegmentedControl } from '@/components/ui/segmented-control.component'
import { Select } from '@/components/ui/select.component'
import { Sheet } from '@/components/ui/sheet.component'
import { notify } from '@/components/ui/toaster.component'
import { CURRENCIES } from '@/constants/currencies.constants'
import { useClock } from '@/contexts/clock.context'
import { useLedger } from '@/contexts/ledger.context'
import { fromMinor, toMinor } from '@/lib/money/money.utils'
import { toPgError } from '@/lib/supabase/pg-error.utils'
import { localDate } from '@/lib/utils/clock.utils'
import type { ObligationOptions, ObligationRow } from '../api/obligations.api'
import { useCreateObligation, useUpdateObligation } from '../hooks/obligations.hook'
import {
  type ObligationFormValues,
  obligationFormSchema,
  toCreateObligationInput,
  toUpdateObligationInput,
} from '../schemas/obligation-form.schema'
import { withTranslatedErrors } from '../utils/form-resolver.utils'

type ObligationFormSheetProps = {
  /** null = create */
  obligation: ObligationRow | null
  options: ObligationOptions
  onClose: () => void
}

const FORM_ID = 'obligation-form'

// No Figma frame for create / edit yet ( has Confirm payment only): built from the form primitives.
export function ObligationFormSheet({ obligation, options, onClose }: ObligationFormSheetProps) {
  const translate = useTranslations('obligations')
  const translateErrors = useTranslations('errors')
  const { ledgerId } = useLedger()
  const clock = useClock()
  const create = useCreateObligation()
  const update = useUpdateObligation()
  const form = useForm<z.input<typeof obligationFormSchema>, unknown, ObligationFormValues>({
    resolver: withTranslatedErrors(zodResolver(obligationFormSchema), (key) =>
      translate(`form.errors.${key}` as 'form.errors.titleRequired'),
    ),
    defaultValues: {
      title: obligation?.title ?? '',
      direction: obligation?.direction ?? 'out',
      amount: obligation?.plannedMinor == null ? '' : fromMinor(obligation.plannedMinor, obligation.currency),
      currency: (obligation?.currency ?? options.accounts[0]?.currency ?? 'UAH') as ObligationFormValues['currency'],
      dueOn: obligation?.dueOn ?? localDate(clock.now(), clock.timeZone),
      accountId: obligation?.accountId ?? null,
      categoryId: obligation?.categoryId ?? null,
    },
  })
  const direction = form.watch('direction')
  const currency = form.watch('currency')
  const pending = create.isPending || update.isPending
  const kind = direction === 'in' ? 'income' : 'expense'
  const none = {
    value: '',
    label: translate('form.none'),
  }

  const onSubmit = form.handleSubmit((values) => {
    const handlers = {
      onSuccess: () => {
        notify.success(translate('form.saved'))
        onClose()
      },
      onError: (error: unknown) => notify.error(translateErrors(`db.${toPgError(error as { code?: string }).kind}`)),
    }

    if (obligation) {
      update.mutate(
        toUpdateObligationInput(values, {
          id: obligation.id,
          ledgerId,
          version: obligation.version,
        }),
        handlers,
      )
    } else {
      create.mutate(
        toCreateObligationInput(values, {
          id: crypto.randomUUID(),
          ledgerId,
        }),
        handlers,
      )
    }
  })

  return (
    <Sheet
      open
      onOpenChange={(open) => !open && onClose()}
      title={translate(obligation ? 'form.editTitle' : 'form.createTitle')}
      footer={
        <>
          <Button variant="secondary" type="button" onClick={onClose}>
            {translate('form.cancel')}
          </Button>
          <Button type="submit" form={FORM_ID} disabled={pending}>
            {translate('form.save')}
          </Button>
        </>
      }
    >
      <form id={FORM_ID} onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        <FormField
          control={form.control}
          name="title"
          label={translate('form.title')}
          render={(field) => <Input {...field} autoFocus />}
        />
        <SegmentedControl
          label={translate('form.kind')}
          options={[
            {
              value: 'out',
              label: translate('form.kindOut'),
            },
            {
              value: 'in',
              label: translate('form.kindIn'),
            },
          ]}
          value={direction}
          onValueChange={(next) => {
            form.setValue('direction', next)
            form.setValue('categoryId', null)
          }}
        />
        <FormField
          control={form.control}
          name="amount"
          label={translate('form.amount')}
          hint={translate('form.amountHint')}
          render={(field) => (
            <MoneyInput
              value={toMinor(field.value, currency)}
              onValueChange={(minor) => field.onChange(minor === null ? '' : fromMinor(minor, currency))}
              currency={currency}
              onBlur={field.onBlur}
            />
          )}
        />
        <FormField
          control={form.control}
          name="currency"
          label={translate('form.currency')}
          render={(field) => (
            <Select
              options={CURRENCIES.map((code) => ({
                value: code,
                label: code,
              }))}
              value={field.value}
              onValueChange={(next) => next && field.onChange(next)}
              onBlur={field.onBlur}
            />
          )}
        />
        <FormField
          control={form.control}
          name="dueOn"
          label={translate('form.dueOn')}
          render={(field) => (
            <DatePicker
              value={field.value}
              onValueChange={(next) => field.onChange(next ?? '')}
              onBlur={field.onBlur}
            />
          )}
        />
        <FormField
          control={form.control}
          name="accountId"
          label={translate('form.account')}
          hint={translate('form.accountHint')}
          render={(field) => (
            <Select
              options={[
                none,
                ...options.accounts.map((account) => ({
                  value: account.id,
                  label: `${account.name} · ${account.currency}`,
                })),
              ]}
              value={field.value ?? ''}
              onValueChange={(next) => field.onChange(next || null)}
              onBlur={field.onBlur}
            />
          )}
        />
        <FormField
          control={form.control}
          name="categoryId"
          label={translate('form.category')}
          hint={translate('form.categoryHint')}
          render={(field) => (
            <Select
              options={[
                none,
                ...options.categories
                  .filter((category) => category.kind === kind)
                  .map((category) => ({
                    value: category.id,
                    label: category.name,
                  })),
              ]}
              value={field.value ?? ''}
              onValueChange={(next) => field.onChange(next || null)}
              onBlur={field.onBlur}
            />
          )}
        />
      </form>
    </Sheet>
  )
}
