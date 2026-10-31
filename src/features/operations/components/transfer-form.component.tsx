'use client'

import { useQuery } from '@tanstack/react-query'
import { Info } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { useForm } from 'react-hook-form'
import { DatePicker } from '@/components/ui/date-picker.component'
import { FormField } from '@/components/ui/form-field.component'
import { MoneyInput } from '@/components/ui/money-input.component'
import { Select } from '@/components/ui/select.component'
import { Textarea } from '@/components/ui/textarea.component'
import { useToday } from '@/contexts/clock.context'
import { useLedgerStore } from '@/contexts/ledger.context'
import { useZodResolver } from '@/lib/forms/zod-resolver.hook'
import { findRate } from '@/lib/money/fx.utils'
import { formatMinor, fromMinor, toMinor } from '@/lib/money/money.utils'
import { operationQueries } from '../api/operations.queries'
import { type TransferFormValues, transferFormSchema } from '../schemas/transfer-form.schema'
import { accountOptions } from '../utils/operation-display.utils'
import { formatRate, impliedRate } from '../utils/rate.utils'
import { CategorySelect } from './category-select.component'

type TransferFormProps = {
  formId: string
  onSubmitAction: (values: TransferFormValues) => void
}

// Figma Saldo file → Transfer 2:22322 / 2:22558: info banner, from + sent, to + received, the rate under them, fee + date,
// comment. Both amounts are the real ones of each account: the rate is only shown, never used to fit them (§5).
export function TransferForm({ formId, onSubmitAction }: TransferFormProps) {
  const translate = useTranslations('operations.form')
  const locale = useLocale()
  const today = useToday()
  const ledgerId = useLedgerStore((ledger) => ledger.ledgerId)
  // the editor mounts the form after the options are loaded; the query cache hands the same data over
  const options = useQuery(operationQueries.options(ledgerId))
  const accounts = options.data?.accounts ?? []
  const categories = options.data?.categories ?? []
  const rates = options.data?.rates ?? []
  const balances = options.data?.balances ?? {}
  // Figma Transfer 2:22322: the balance hint under each account
  const balanceHint = (accountId: string, currency: string) =>
    balances[accountId] === undefined
      ? undefined
      : translate('balance', { amount: formatMinor(balances[accountId], currency, locale) })
  const resolver = useZodResolver(transferFormSchema)
  const active = accounts.filter((account) => !account.archived)
  const [source, target] = [active[0], active[1] ?? active[0]]
  const form = useForm<TransferFormValues>({
    resolver,
    defaultValues: {
      fromAccountId: source?.id ?? '',
      toAccountId: target?.id ?? '',
      fromAmount: '',
      fromCurrency: source?.currency ?? 'UAH',
      toAmount: '',
      toCurrency: target?.currency ?? 'UAH',
      fee: '',
      feeCategoryId: null,
      occurredOn: today,
      note: '',
    },
  })
  const [fromCurrency, toCurrency, fromAmount, toAmount, fee, occurredOn] = form.watch([
    'fromCurrency',
    'toCurrency',
    'fromAmount',
    'toAmount',
    'fee',
    'occurredOn',
  ])
  const crossCurrency = fromCurrency !== toCurrency
  const fromMinorValue = toMinor(fromAmount, fromCurrency)
  const toMinorValue = toMinor(toAmount, toCurrency)
  const rate =
    crossCurrency && fromMinorValue && toMinorValue
      ? impliedRate(fromMinorValue, fromCurrency, toMinorValue, toCurrency)
      : null
  const reference = crossCurrency ? findRate(rates, fromCurrency, toCurrency, occurredOn) : null

  const accountField =
    (name: 'fromAccountId' | 'toAccountId', currencyName: 'fromCurrency' | 'toCurrency') =>
    (value: string | null, onChange: (next: string) => void) => {
      onChange(value ?? '')
      form.setValue(currencyName, accounts.find((account) => account.id === value)?.currency ?? 'UAH')
      void form.trigger(name === 'fromAccountId' ? 'toAccountId' : 'fromAccountId')
    }

  return (
    <form id={formId} noValidate onSubmit={form.handleSubmit(onSubmitAction)} className="flex flex-col gap-4">
      {/* Figma Banner 2:10028: padding 12/16, gap 12, text body-medium; the icon box (20 + 2/2) sits on the first line */}
      <p className="flex items-start gap-3 rounded-inner bg-primary-soft px-4 py-3 text-body font-medium text-primary-text">
        <span className="flex shrink-0 py-0.5">
          <Info aria-hidden size={20} />
        </span>
        {translate('transferNote')}
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          control={form.control}
          name="fromAccountId"
          label={translate('from')}
          required
          hint={balanceHint(form.watch('fromAccountId'), fromCurrency)}
          render={(field) => (
            <Select
              options={accountOptions(accounts)}
              value={field.value || null}
              onValueChange={(value) => accountField('fromAccountId', 'fromCurrency')(value, field.onChange)}
              onBlur={field.onBlur}
            />
          )}
        />
        <FormField
          control={form.control}
          name="fromAmount"
          label={translate('fromAmount')}
          required
          render={(field) => (
            <MoneyInput
              value={fromMinorValue}
              onValueChange={(minor) => field.onChange(minor === null ? '' : fromMinor(minor, fromCurrency))}
              currency={fromCurrency}
              sign="−"
              onBlur={field.onBlur}
              ref={field.ref}
            />
          )}
        />
        <FormField
          control={form.control}
          name="toAccountId"
          label={translate('to')}
          required
          hint={balanceHint(form.watch('toAccountId'), toCurrency)}
          render={(field) => (
            <Select
              options={accountOptions(accounts)}
              value={field.value || null}
              onValueChange={(value) => accountField('toAccountId', 'toCurrency')(value, field.onChange)}
              onBlur={field.onBlur}
            />
          )}
        />
        {crossCurrency ? (
          <FormField
            control={form.control}
            name="toAmount"
            label={translate('toAmount')}
            required
            render={(field) => (
              <MoneyInput
                value={toMinorValue}
                onValueChange={(minor) => field.onChange(minor === null ? '' : fromMinor(minor, toCurrency))}
                currency={toCurrency}
                sign="+"
                onBlur={field.onBlur}
                ref={field.ref}
              />
            )}
          />
        ) : null}
      </div>
      {rate ? (
        <p className="text-caption text-text-secondary">
          {translate('rate', {
            rate: formatRate(rate, locale),
            currency: fromCurrency,
          })}
          {reference ? `, ${translate('rateReference', { rate: formatRate(reference, locale) })}` : null}.{' '}
          {translate('rateNote')}
        </p>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          control={form.control}
          name="fee"
          label={translate('fee')}
          hint={translate('feeHint')}
          render={(field) => (
            <MoneyInput
              value={toMinor(field.value, fromCurrency)}
              onValueChange={(minor) => field.onChange(minor === null ? '' : fromMinor(minor, fromCurrency))}
              currency={fromCurrency}
              onBlur={field.onBlur}
              ref={field.ref}
            />
          )}
        />
        <FormField
          control={form.control}
          name="occurredOn"
          label={translate('date')}
          required
          render={(field) => (
            <DatePicker
              value={field.value}
              onValueChange={(value) => field.onChange(value ?? today)}
              onBlur={field.onBlur}
            />
          )}
        />
      </div>
      {fee.trim() !== '' ? (
        <FormField
          control={form.control}
          name="feeCategoryId"
          label={translate('feeCategory')}
          render={(field) => (
            <CategorySelect
              categories={categories}
              kind="expense"
              noneLabel={translate('noCategory')}
              value={field.value}
              onValueChange={field.onChange}
              onBlur={field.onBlur}
            />
          )}
        />
      ) : null}
      <FormField
        control={form.control}
        name="note"
        label={translate('note')}
        render={(field) => <Textarea {...field} />}
      />
    </form>
  )
}
