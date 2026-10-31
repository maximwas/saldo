'use client'

import { useTranslations } from 'next-intl'
import { useFormContext } from 'react-hook-form'
import { CategoryBadge } from '@/components/ui/category-badge.component'
import { DatePicker } from '@/components/ui/date-picker.component'
import { FormField } from '@/components/ui/form-field.component'
import { Input } from '@/components/ui/input.component'
import { MoneyInput } from '@/components/ui/money-input.component'
import { Select } from '@/components/ui/select.component'
import { Textarea } from '@/components/ui/textarea.component'
import { CURRENCIES } from '@/constants/currencies.constants'
import { cn } from '@/lib/utils/cn.utils'
import { useSubscriptionOptions } from '../hooks/subscriptions.hook'
import type { SubscriptionFormInput } from '../schemas/subscription-form.schema'
import { RECURRENCE_UNITS, SHORT_MONTH_RULES } from '../schemas/subscription-input.schema'
import type { SubscriptionStatus } from '../utils/subscription-series.utils'
import { CUSTOM_SERVICE, ServiceSelect } from './service-select.component'

const NO_CATEGORY = 'none'
// cancellation states are set from the card (cancel sheet), the form offers them only to keep the current value
const FORM_STATUSES: SubscriptionStatus[] = ['active', 'trial', 'paused']

type SubscriptionFieldsProps = {
  /** a new subscription takes its first amount and currency here; later prices go through «Change price» */
  mode: 'create' | 'edit'
}

// Figma «Saldo» → New subscription 36:104935 and Settings 29:94905: service picker, the name of a custom one, account,
// category, currency, short-month rule; edit sets them in two columns. Reminder and Calendar selects of those frames
// wait for their columns (phase 3). The amount, recurrence, first date, state, link and note are not drawn there, but a
// subscription cannot be saved without them, so they follow the drawn fields.
export function SubscriptionFields({ mode }: SubscriptionFieldsProps) {
  const translate = useTranslations('subscriptions.form')
  const translateStatus = useTranslations('subscriptions.status')
  const translateCurrency = useTranslations('currencies')
  const { control, watch, setValue } = useFormContext<SubscriptionFormInput>()
  const options = useSubscriptionOptions()
  const [service, currency, unit, status] = watch(['service', 'currency', 'unit', 'status'])
  const statuses = FORM_STATUSES.includes(status) ? FORM_STATUSES : [...FORM_STATUSES, status]
  const edit = mode === 'edit'

  return (
    <div className={cn('flex flex-col gap-4', edit && 'lg:grid lg:grid-cols-2 lg:gap-x-6')}>
      <div className="flex flex-col gap-4">
        <FormField
          control={control}
          name="service"
          label={translate('service')}
          required
          render={(field) => (
            <ServiceSelect
              name={field.name}
              value={field.value}
              onBlur={field.onBlur}
              onValueChange={(next, typed) => {
                field.onChange(next)
                setValue('name', next === CUSTOM_SERVICE ? typed : next, { shouldDirty: true })
              }}
            />
          )}
        />
        {service === CUSTOM_SERVICE ? (
          <FormField
            control={control}
            name="name"
            label={translate('name')}
            required
            render={(field) => <Input {...field} autoComplete="off" />}
          />
        ) : null}
        <FormField
          control={control}
          name="accountId"
          label={translate('account')}
          required
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
                  leading: <CategoryBadge icon={category.icon} color={category.color} size={32} />,
                })),
              ]}
            />
          )}
        />
        {edit ? null : (
          <FormField
            control={control}
            name="currency"
            label={translate('currency')}
            required
            hint={translate('currencyHint')}
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
        )}
      </div>
      <div className="flex flex-col gap-4">
        {unit === 'day' ? null : (
          <FormField
            control={control}
            name="shortMonthRule"
            label={translate('shortMonthRule')}
            required
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
        {edit ? null : (
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
        )}
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
          required
          hint={translate('firstOnHint')}
          render={(field) => (
            <DatePicker name={field.name} value={field.value} onValueChange={field.onChange} onBlur={field.onBlur} />
          )}
        />
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
