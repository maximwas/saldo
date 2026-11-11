'use client'

import { useQuery } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { useForm, useWatch } from 'react-hook-form'
import { useMoneyText } from '@/components/ui/amount.component'
import { Banner } from '@/components/ui/banner.component'
import { DatePicker } from '@/components/ui/date-picker.component'
import { FormField } from '@/components/ui/form-field.component'
import { MoneyInput } from '@/components/ui/money-input.component'
import { Select } from '@/components/ui/select.component'
import { Textarea } from '@/components/ui/textarea.component'
import { useToday } from '@/contexts/clock.context'
import { useLedgerStore } from '@/contexts/ledger.context'
import { useDayText, useMonthOf } from '@/lib/dates/day-text.hook'
import { useZodResolver } from '@/lib/forms/zod-resolver.hook'
import { fromMinor, toMinor } from '@/lib/money/money.utils'
import { operationQueries } from '../api/operations.queries'
import type { OperationRow } from '../operations.types'
import { factFormSchema, type OperationFormValues, validatedMinor } from '../schemas/operation-form.schema'
import { accountOptions } from '../utils/operation-display.utils'

type RefundFormProps = {
  formId: string
  purchase: OperationRow
  /** what is still refundable of the purchase, in its currency */
  limitMinor: number
  onSubmitAction: (values: OperationFormValues) => void
}

// Figma Saldo → refund 14:75084: the purchase line (label, secondary), the amount (starts at what is left to refund and
// is never above it), account in the purchase currency (the database refunds in that currency) and date in one row
// (gap 12), comment, and the Info banner naming the month, the category and the sum; category and payee are the
// purchase's.
export function RefundForm({ formId, purchase, limitMinor, onSubmitAction }: RefundFormProps) {
  const translate = useTranslations('operations')
  const dayText = useDayText()
  const monthOf = useMonthOf()
  const moneyText = useMoneyText()
  const today = useToday()
  const ledgerId = useLedgerStore((ledger) => ledger.ledgerId)
  const options = useQuery(operationQueries.options(ledgerId))
  const accounts = (options.data?.accounts ?? []).filter((account) => account.currency === purchase.currency)
  const currency = purchase.currency as OperationFormValues['currency']
  const limit = moneyText(limitMinor, currency)
  const categories = options.data?.categories ?? []
  const category = categories.find((candidate) => candidate.id === purchase.categoryId)?.name
  const accountName = accounts.find((account) => account.id === purchase.accountId)?.name ?? ''
  const form = useForm<OperationFormValues>({
    resolver: useZodResolver(factFormSchema(today)),
    defaultValues: {
      kind: 'refund',
      direction: 'in',
      amount: fromMinor(limitMinor, currency),
      currency,
      accountId: purchase.accountId,
      categoryId: purchase.categoryId,
      occurredOn: today,
      occurredTime: '',
      counterparty: purchase.counterparty ?? '',
      note: '',
    },
  })

  const submit = form.handleSubmit((values) => {
    if (validatedMinor(values.amount, currency) > limitMinor) {
      form.setError('amount', { message: translate('refund.tooMuch', { amount: limit }) })

      return
    }

    onSubmitAction(values)
  })

  // the month in the genitive the day-month format uses
  const [occurredOn, amountText] = useWatch({
    control: form.control,
    name: ['occurredOn', 'amount'],
  })
  const month = monthOf(occurredOn)
  const amount = toMinor(amountText, currency)
  const purchaseLine = [
    purchase.counterparty ?? category ?? translate('kinds.expense'),
    moneyText(-purchase.amountMinor, currency),
    dayText(purchase.occurredOn, 'shortYear'),
    accountName,
  ].join(' · ')

  return (
    <form id={formId} noValidate onSubmit={submit} className="flex flex-col gap-4">
      <p className="text-label text-text-secondary">{purchaseLine}</p>
      <FormField
        control={form.control}
        name="amount"
        label={translate('refund.amount')}
        required
        hint={translate('refund.limit', { amount: limit })}
        render={(field) => (
          <MoneyInput
            autoFocus
            value={toMinor(field.value, currency)}
            onValueChange={(minor) => field.onChange(minor === null ? '' : fromMinor(minor, currency))}
            currency={currency}
            sign="+"
            onBlur={field.onBlur}
            ref={field.ref}
          />
        )}
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <FormField
          control={form.control}
          name="accountId"
          label={translate('form.account')}
          required
          render={(field) => (
            <Select
              options={accountOptions(accounts, field.value)}
              value={field.value || null}
              onValueChange={(value) => field.onChange(value ?? '')}
              onBlur={field.onBlur}
            />
          )}
        />
        <FormField
          control={form.control}
          name="occurredOn"
          label={translate('form.date')}
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
      <FormField
        control={form.control}
        name="note"
        label={translate('form.note')}
        hint={translate('refund.noteHint')}
        render={(field) => <Textarea {...field} />}
      />
      {/* Figma 15:79735: the «more than refundable» state drops the banner */}
      {form.formState.errors.amount ? null : (
        <Banner>
          {category && month && amount
            ? translate('refund.effect', {
                month,
                category,
                amount: moneyText(amount, currency),
              })
            : translate('refund.info')}
        </Banner>
      )}
    </form>
  )
}
