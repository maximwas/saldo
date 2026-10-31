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
import { formatMinor, fromMinor, toMinor } from '@/lib/money/money.utils'
import { operationQueries } from '../api/operations.queries'
import type { OperationRow } from '../operations.types'
import { type OperationFormValues, operationFormSchema, validatedMinor } from '../schemas/operation-form.schema'
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
  const locale = useLocale()
  const today = useToday()
  const ledgerId = useLedgerStore((ledger) => ledger.ledgerId)
  const options = useQuery(operationQueries.options(ledgerId))
  const accounts = (options.data?.accounts ?? []).filter((account) => account.currency === purchase.currency)
  const currency = purchase.currency as OperationFormValues['currency']
  const limit = formatMinor(limitMinor, currency, locale)
  const categories = options.data?.categories ?? []
  const category = categories.find((candidate) => candidate.id === purchase.categoryId)?.name
  const accountName = accounts.find((account) => account.id === purchase.accountId)?.name ?? ''
  const form = useForm<OperationFormValues>({
    resolver: useZodResolver(operationFormSchema),
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

  const purchaseDate = new Date(`${purchase.occurredOn}T12:00:00Z`)
  // the month in the genitive the day-month format uses
  const month = new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  })
    .formatToParts(new Date(`${form.watch('occurredOn')}T12:00:00Z`))
    .find((part) => part.type === 'month')?.value
  const amount = toMinor(form.watch('amount'), currency)
  const purchaseLine = [
    purchase.counterparty ?? category ?? translate('kinds.expense'),
    formatMinor(-purchase.amountMinor, currency, locale),
    new Intl.DateTimeFormat(locale, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(purchaseDate),
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
      <p className="flex items-center gap-3 rounded-inner bg-primary-soft px-4 py-3 text-body font-medium text-primary-text">
        <Info aria-hidden size={20} className="shrink-0" />
        {category && month && amount
          ? translate('refund.effect', {
              month,
              category,
              amount: formatMinor(amount, currency, locale),
            })
          : translate('refund.info')}
      </p>
    </form>
  )
}
