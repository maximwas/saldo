'use client'

import { useTranslations } from 'next-intl'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { DatePicker } from '@/components/ui/date-picker.component'
import { FormField } from '@/components/ui/form-field.component'
import { Input } from '@/components/ui/input.component'
import { MoneyInput } from '@/components/ui/money-input.component'
import { Select } from '@/components/ui/select.component'
import { Textarea } from '@/components/ui/textarea.component'
import { useClock } from '@/contexts/clock.context'
import { useZodResolver } from '@/lib/forms/zod-resolver.hook'
import { fromMinor, toMinor } from '@/lib/money/money.utils'
import { localDate } from '@/lib/utils/clock.utils'
import type { AccountOption, CategoryOption } from '../operations.types'
import { type OperationFormValues, operationFormSchema } from '../schemas/operation-form.schema'
import { accountOptions, categoryOptions } from '../utils/operation-display.utils'

const NO_CATEGORY = '__none__'

type OperationFormProps = {
  formId: string
  /** income or expense: the kind of the sheet's switch (an edited row keeps its own) */
  kind: 'expense' | 'income'
  accounts: AccountOption[]
  categories: CategoryOption[]
  defaults?: Partial<OperationFormValues>
  disabled?: boolean
  onSubmitAction: (values: OperationFormValues) => void
  /** the receipt field goes after the comment, inside the form */
  children?: React.ReactNode
}

// Figma Saldo file → New operation 2:16567 / 2:18677: amount, account + category in a row, date, payee, comment, receipt.
// shortcut: no "Time" field: the time is "now" for today and noon for another date (toOccurredAt)
export function OperationForm({
  formId,
  kind,
  accounts,
  categories,
  defaults,
  disabled = false,
  onSubmitAction,
  children,
}: OperationFormProps) {
  const translate = useTranslations('operations.form')
  const clock = useClock()
  const resolver = useZodResolver(operationFormSchema)
  const firstAccount = accounts.find((account) => !account.archived)
  const form = useForm<OperationFormValues>({
    resolver,
    defaultValues: {
      kind,
      direction: kind === 'income' ? 'in' : 'out',
      amount: '',
      currency: firstAccount?.currency ?? 'UAH',
      accountId: firstAccount?.id ?? '',
      categoryId: null,
      occurredOn: localDate(clock.now(), clock.timeZone),
      counterparty: '',
      note: '',
      ...defaults,
    },
  })
  const currency = form.watch('currency')
  const editedKind = form.watch('kind')
  const categoryKind = editedKind === 'income' ? 'income' : 'expense'

  // the sheet's Expense / Income switch: a category of the other kind no longer fits
  useEffect(() => {
    if (kind !== form.getValues('kind')) {
      form.setValue('kind', kind)
      form.setValue('direction', kind === 'income' ? 'in' : 'out')
      form.setValue('categoryId', null)
    }
  }, [kind, form])

  return (
    <form id={formId} noValidate onSubmit={form.handleSubmit(onSubmitAction)} className="flex flex-col gap-4">
      <FormField
        control={form.control}
        name="amount"
        label={translate('amount')}
        render={(field) => (
          <MoneyInput
            value={toMinor(field.value, currency)}
            onValueChange={(minor) => field.onChange(minor === null ? '' : fromMinor(minor, currency))}
            currency={currency}
            sign={editedKind === 'expense' ? '−' : '+'}
            disabled={disabled}
            onBlur={field.onBlur}
            ref={field.ref}
          />
        )}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          control={form.control}
          name="accountId"
          label={translate('account')}
          render={(field) => (
            <Select
              options={accountOptions(accounts, field.value)}
              value={field.value || null}
              onValueChange={(value) => {
                field.onChange(value ?? '')
                // the operation currency is the account's (the DB enforces it)
                form.setValue('currency', accounts.find((account) => account.id === value)?.currency ?? currency)
              }}
              disabled={disabled}
              onBlur={field.onBlur}
            />
          )}
        />
        <FormField
          control={form.control}
          name="categoryId"
          label={translate('category')}
          render={(field) => (
            <Select
              options={[
                {
                  value: NO_CATEGORY,
                  label: translate('noCategory'),
                },
                ...categoryOptions(categories, categoryKind, field.value),
              ]}
              value={field.value ?? NO_CATEGORY}
              onValueChange={(value) => field.onChange(value === NO_CATEGORY ? null : value)}
              disabled={disabled}
              onBlur={field.onBlur}
            />
          )}
        />
      </div>
      <FormField
        control={form.control}
        name="occurredOn"
        label={translate('date')}
        render={(field) => (
          <DatePicker
            value={field.value}
            onValueChange={(value) => field.onChange(value ?? localDate(clock.now(), clock.timeZone))}
            disabled={disabled}
            onBlur={field.onBlur}
          />
        )}
      />
      <FormField
        control={form.control}
        name="counterparty"
        label={translate('counterparty')}
        hint={translate('counterpartyHint')}
        render={(field) => <Input {...field} disabled={disabled} autoComplete="off" />}
      />
      <FormField
        control={form.control}
        name="note"
        label={translate('note')}
        hint={translate('noteHint')}
        render={(field) => <Textarea {...field} disabled={disabled} />}
      />
      {children}
    </form>
  )
}
