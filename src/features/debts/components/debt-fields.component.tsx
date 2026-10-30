'use client'

import { useTranslations } from 'next-intl'
import { useFormContext } from 'react-hook-form'
import { DatePicker } from '@/components/ui/date-picker.component'
import { FormField } from '@/components/ui/form-field.component'
import { Input } from '@/components/ui/input.component'
import { Select } from '@/components/ui/select.component'
import { Textarea } from '@/components/ui/textarea.component'
import { useDebtAccounts } from '../hooks/debts.hook'
import type { DebtEditFormValues } from '../schemas/debt-edit-form.schema'

// the fields both the create and the edit form share; the form values of either carry these keys
export function DebtPersonFields() {
  const translate = useTranslations('debts')
  const { control } = useFormContext<DebtEditFormValues>()

  return (
    <>
      <FormField
        control={control}
        name="person"
        label={translate('form.person')}
        render={(field) => <Input {...field} autoComplete="off" />}
      />
      <FormField
        control={control}
        name="reason"
        label={translate('form.reason')}
        render={(field) => <Input {...field} autoComplete="off" />}
      />
    </>
  )
}

type PickedAccount = {
  id: string
  currency: string
}

type DebtAccountFieldProps = {
  label: string
  hint?: string
  /** an optional account gets a «no account» row */
  optional: boolean
  /** only the accounts of this currency; undefined = all */
  currency?: string
  onPicked?: (account: PickedAccount) => void
}

export function DebtAccountField({ label, hint, optional, currency, onPicked }: DebtAccountFieldProps) {
  const translate = useTranslations('debts')
  const accounts = useDebtAccounts().data ?? []
  const { control } = useFormContext<DebtEditFormValues>()
  const options = accounts
    .filter((account) => currency === undefined || account.currency === currency)
    .map((account) => ({
      value: account.id,
      label: `${account.name} · ${account.currency}`,
    }))

  return (
    <FormField
      control={control}
      name="accountId"
      label={label}
      hint={hint}
      render={(field) => (
        <Select
          options={
            optional
              ? [
                  {
                    value: '',
                    label: translate('form.accountOptional'),
                  },
                  ...options,
                ]
              : options
          }
          value={field.value ?? ''}
          onValueChange={(next) => {
            field.onChange(next || null)

            const picked = accounts.find((account) => account.id === next)

            if (picked) {
              onPicked?.(picked)
            }
          }}
          onBlur={field.onBlur}
        />
      )}
    />
  )
}

export function DebtDueNoteFields() {
  const translate = useTranslations('debts')
  const { control } = useFormContext<DebtEditFormValues>()

  return (
    <>
      <FormField
        control={control}
        name="dueOn"
        label={translate('form.dueOn')}
        hint={translate('form.dueHint')}
        render={(field) => (
          <DatePicker clearable value={field.value} onValueChange={field.onChange} onBlur={field.onBlur} />
        )}
      />
      <FormField
        control={control}
        name="note"
        label={translate('form.note')}
        render={(field) => <Textarea {...field} rows={3} />}
      />
    </>
  )
}
