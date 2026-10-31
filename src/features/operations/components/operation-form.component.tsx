'use client'

import { useQuery } from '@tanstack/react-query'
import { useLocale, useTranslations } from 'next-intl'
import { useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { Badge } from '@/components/ui/badge.component'
import { Button } from '@/components/ui/button.component'
import { DatePicker } from '@/components/ui/date-picker.component'
import { FormField } from '@/components/ui/form-field.component'
import { Input } from '@/components/ui/input.component'
import { MoneyInput } from '@/components/ui/money-input.component'
import { Select } from '@/components/ui/select.component'
import { useIsDesktop } from '@/components/ui/sheet.component'
import { Textarea } from '@/components/ui/textarea.component'
import { useToday } from '@/contexts/clock.context'
import { useLedgerStore } from '@/contexts/ledger.context'
import { useFormDraft } from '@/lib/forms/form-draft.hook'
import { useZodResolver } from '@/lib/forms/zod-resolver.hook'
import { formatMinor, fromMinor, toMinor } from '@/lib/money/money.utils'
import { operationQueries } from '../api/operations.queries'
import { factFormSchema, type OperationFormValues } from '../schemas/operation-form.schema'
import { accountOptions } from '../utils/operation-display.utils'
import { CategorySelect } from './category-select.component'

type OperationFormProps = {
  formId: string
  /** income or expense: the kind of the sheet's switch (an edited row keeps its own) */
  kind: 'expense' | 'income'
  defaults?: Partial<OperationFormValues>
  /** the date came from a calendar day: say it can still be changed (Figma 2:72362) */
  dateFromCalendar?: boolean
  /** a new operation keeps what is typed as a draft under this key (drafts.store.ts) */
  draftKey?: string
  disabled?: boolean
  onSubmitAction: (values: OperationFormValues) => void
  /** the receipt field goes after the comment, inside the form */
  children?: React.ReactNode
}

// Figma Saldo file → New operation 2:16567 / 2:18677: amount; account + category and date + time in rows (gap 16, 12 on
// mobile); payee; comment; receipt. The account and payee hints show on desktop only, as in the frames.
// Income 2:17848 / 2:19885 shows neither hint (and no receipt, see the editor). No category hint: there are no
// subcategories (Figma 31.10; 5:101464, 2:17848 hide it).
// An empty time keeps the old rule: now for today, noon for another date (toOccurredAt)
export function OperationForm({
  formId,
  kind,
  defaults,
  dateFromCalendar = false,
  draftKey,
  disabled = false,
  onSubmitAction,
  children,
}: OperationFormProps) {
  const translate = useTranslations('operations.form')
  const translateDraft = useTranslations('sync.draft')
  const locale = useLocale()
  const today = useToday()
  const ledgerId = useLedgerStore((ledger) => ledger.ledgerId)
  // the editor mounts the form after the options are loaded; the query cache hands the same data over
  const options = useQuery(operationQueries.options(ledgerId))
  const accounts = options.data?.accounts ?? []
  const categories = options.data?.categories ?? []
  const balances = options.data?.balances ?? {}
  const resolver = useZodResolver(useMemo(() => factFormSchema(today), [today]))
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
      occurredOn: today,
      occurredTime: '',
      counterparty: '',
      note: '',
      ...defaults,
    },
  })
  const draft = useFormDraft(draftKey ?? null, form)
  const currency = form.watch('currency')
  const accountId = form.watch('accountId')
  const balance = balances[accountId]
  const editedKind = form.watch('kind')
  const categoryKind = editedKind === 'income' ? 'income' : 'expense'
  const expense = editedKind === 'expense'
  // the hints show in the desktop dialog only (2:16567 vs 2:18677) and never for an income (2:17848)
  const desktop = useIsDesktop()
  const hints = expense && desktop

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
      {draft.restored ? (
        <div className="flex items-center gap-2">
          <Badge tone="info">{translateDraft('restored')}</Badge>
          <Button type="button" variant="ghost" size="s" onClick={draft.discard}>
            {translateDraft('discard')}
          </Button>
        </div>
      ) : null}
      <FormField
        control={form.control}
        name="amount"
        label={translate('amount')}
        required
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
      <div className="grid gap-3 sm:grid-cols-2 md:gap-4">
        <FormField
          control={form.control}
          name="accountId"
          label={translate('account')}
          required
          hint={
            !hints || balance === undefined
              ? undefined
              : translate('balance', { amount: formatMinor(balance, currency, locale) })
          }
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
          required
          render={(field) => (
            <CategorySelect
              categories={categories}
              kind={categoryKind}
              noneLabel={translate('noCategory')}
              value={field.value}
              onValueChange={field.onChange}
              disabled={disabled}
              onBlur={field.onBlur}
            />
          )}
        />
      </div>
      <div className="grid grid-cols-2 gap-3 md:gap-4">
        <FormField
          control={form.control}
          name="occurredOn"
          label={translate('date')}
          hint={dateFromCalendar ? translate('dateFromCalendar') : undefined}
          required
          render={(field) => (
            <DatePicker
              value={field.value}
              onValueChange={(value) => field.onChange(value ?? today)}
              disabled={disabled}
              onBlur={field.onBlur}
            />
          )}
        />
        <FormField
          control={form.control}
          name="occurredTime"
          label={translate('time')}
          render={(field) => (
            <Input {...field} disabled={disabled} inputMode="numeric" maxLength={5} autoComplete="off" />
          )}
        />
      </div>
      <FormField
        control={form.control}
        name="counterparty"
        // Figma 2:17848: an income names its payer (the source label)
        label={translate(expense ? 'counterparty' : 'payer')}
        required={expense}
        hint={hints ? translate('counterpartyHint') : undefined}
        render={(field) => <Input {...field} disabled={disabled} autoComplete="off" />}
      />
      <FormField
        control={form.control}
        name="note"
        label={translate('note')}
        render={(field) => <Textarea {...field} disabled={disabled} />}
      />
      {children}
    </form>
  )
}
