'use client'

import { useTranslations } from 'next-intl'
import { useFormContext } from 'react-hook-form'
import { DatePicker } from '@/components/ui/date-picker.component'
import { FormField } from '@/components/ui/form-field.component'
import { Input } from '@/components/ui/input.component'
import { MoneyInput } from '@/components/ui/money-input.component'
import { Select } from '@/components/ui/select.component'
import { ServiceLogo } from '@/components/ui/service-logo.component'
import { Textarea } from '@/components/ui/textarea.component'
import { CURRENCIES } from '@/constants/currencies.constants'
import { cn } from '@/lib/utils/cn.utils'
import { useSubscriptionOptions } from '../hooks/subscriptions.hook'
import type { SubscriptionFormInput } from '../schemas/subscription-form.schema'
import { RECURRENCE_UNITS, SHORT_MONTH_RULES } from '../schemas/subscription-input.schema'
import type { SubscriptionStatus } from '../utils/subscription-series.utils'

const NO_CATEGORY = 'none'
// cancellation states are set from the card (cancel sheet), the form offers them only to keep the current value
const FORM_STATUSES: SubscriptionStatus[] = ['active', 'trial', 'paused']

type SubscriptionFieldsProps = {
  /** a new subscription takes its first amount and currency here; later prices go through «Change price» */
  mode: 'create' | 'edit'
}

// Figma «Saldo» → Subscription card · Settings 5:105808 and the edit dialog 5:96222: name with the service logo,
// the amount per period, account, category, recurrence (unit, every N, first date, short-month rule), state.
export function SubscriptionFields({ mode }: SubscriptionFieldsProps) {
  const translate = useTranslations('subscriptions.form')
  const translateStatus = useTranslations('subscriptions.status')
  const translateCurrency = useTranslations('currencies')
  const { control, watch } = useFormContext<SubscriptionFormInput>()
  const options = useSubscriptionOptions()
  const [name, currency, unit, status] = watch(['name', 'currency', 'unit', 'status'])
  const statuses = FORM_STATUSES.includes(status) ? FORM_STATUSES : [...FORM_STATUSES, status]
  // a span on a one-column grid would add an implicit second column
  const wide = mode === 'edit' ? 'lg:col-span-2' : undefined

  return (
    // the create dialog is narrow: one column there, two in the wide Settings card
    <div className={cn('grid gap-4', mode === 'edit' && 'lg:grid-cols-2')}>
      <div className={cn('flex items-end gap-3', wide)}>
        {name.trim() ? <ServiceLogo name={name} className="mb-1" /> : null}
        <div className="min-w-0 flex-1">
          <FormField
            control={control}
            name="name"
            label={translate('name')}
            render={(field) => <Input {...field} autoComplete="off" />}
          />
        </div>
      </div>
      {mode === 'create' ? (
        <div className="grid grid-cols-2 items-start gap-4">
          <FormField
            control={control}
            name="amountMinor"
            label={translate('amount')}
            hint={translate('amountHint')}
            render={(field) => (
              <MoneyInput
                ref={field.ref}
                name={field.name}
                value={field.value}
                onValueChange={field.onChange}
                onBlur={field.onBlur}
                currency={currency}
                placeholder="0,00"
              />
            )}
          />
          <FormField
            control={control}
            name="currency"
            label={translate('currency')}
            render={(field) => (
              <Select
                name={field.name}
                value={field.value}
                onValueChange={field.onChange}
                onBlur={field.onBlur}
                options={CURRENCIES.map((code) => ({
                  value: code,
                  label: `${translateCurrency(`names.${code}`)} (${code})`,
                }))}
              />
            )}
          />
        </div>
      ) : null}
      <FormField
        control={control}
        name="accountId"
        label={translate('account')}
        hint={translate('accountHint')}
        render={(field) => (
          <Select
            name={field.name}
            value={field.value}
            onValueChange={field.onChange}
            onBlur={field.onBlur}
            placeholder={translate('accountPlaceholder')}
            options={(options.data?.accounts ?? []).map((account) => ({
              value: account.id,
              label: account.name,
            }))}
          />
        )}
      />
      <FormField
        control={control}
        name="categoryId"
        label={translate('category')}
        render={(field) => (
          <Select
            name={field.name}
            value={field.value ?? NO_CATEGORY}
            onValueChange={(value) => field.onChange(value === NO_CATEGORY ? null : value)}
            onBlur={field.onBlur}
            options={[
              {
                value: NO_CATEGORY,
                label: translate('noCategory'),
              },
              ...(options.data?.categories ?? []).map((category) => ({
                value: category.id,
                label: category.name,
              })),
            ]}
          />
        )}
      />
      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={control}
          name="count"
          label={translate('count')}
          render={(field) => <Input {...field} inputMode="numeric" autoComplete="off" />}
        />
        <FormField
          control={control}
          name="unit"
          label={translate('unit')}
          render={(field) => (
            <Select
              name={field.name}
              value={field.value}
              onValueChange={field.onChange}
              onBlur={field.onBlur}
              options={RECURRENCE_UNITS.map((value) => ({
                value,
                label: translate(`units.${value}`),
              }))}
            />
          )}
        />
      </div>
      <FormField
        control={control}
        name="firstOn"
        label={translate('firstOn')}
        hint={translate('firstOnHint')}
        render={(field) => (
          <DatePicker name={field.name} value={field.value} onValueChange={field.onChange} onBlur={field.onBlur} />
        )}
      />
      {unit === 'day' ? null : (
        <FormField
          control={control}
          name="shortMonthRule"
          label={translate('shortMonthRule')}
          hint={translate('shortMonthHint')}
          render={(field) => (
            <Select
              name={field.name}
              value={field.value}
              onValueChange={field.onChange}
              onBlur={field.onBlur}
              options={SHORT_MONTH_RULES.map((value) => ({
                value,
                label: translate(`rules.${value}`),
              }))}
            />
          )}
        />
      )}
      <FormField
        control={control}
        name="status"
        label={translate('status')}
        render={(field) => (
          <Select
            name={field.name}
            value={field.value}
            onValueChange={field.onChange}
            onBlur={field.onBlur}
            options={statuses.map((value) => ({
              value,
              label: translateStatus(value),
            }))}
          />
        )}
      />
      {status === 'trial' ? (
        <FormField
          control={control}
          name="trialEndsOn"
          label={translate('trialEndsOn')}
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
      ) : null}
      <FormField
        control={control}
        name="serviceUrl"
        label={translate('serviceUrl')}
        render={(field) => <Input {...field} inputMode="url" autoComplete="off" />}
      />
      <div className={wide}>
        <FormField
          control={control}
          name="note"
          label={translate('note')}
          render={(field) => <Textarea {...field} rows={2} />}
        />
      </div>
    </div>
  )
}
