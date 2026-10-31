'use client'

import { useQueryClient } from '@tanstack/react-query'
import { useFormatter, useTranslations } from 'next-intl'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import type { z } from 'zod'
import { Button } from '@/components/ui/button.component'
import { DatePicker } from '@/components/ui/date-picker.component'
import { FormField } from '@/components/ui/form-field.component'
import { MoneyInput } from '@/components/ui/money-input.component'
import { Select } from '@/components/ui/select.component'
import { Sheet } from '@/components/ui/sheet.component'
import { Switch } from '@/components/ui/switch.component'
import { notify } from '@/components/ui/toaster.component'
import { isMoneyQuery } from '@/constants/query-roots.constants'
import { useClock, useToday } from '@/contexts/clock.context'
import { useLedgerStore } from '@/contexts/ledger.context'
import { useZodResolver } from '@/lib/forms/zod-resolver.hook'
import { fromMinor, toMinor } from '@/lib/money/money.utils'
import { toPgError } from '@/lib/supabase/pg-error.utils'
import type { ObligationOptions, ObligationRow } from '../api/obligations.api'
import { useCandidateOperations, useObligationOptions, usePayObligation } from '../hooks/obligations.hook'
import {
  type PayObligationFormValues,
  payObligationFormSchema,
  toPayObligationInput,
} from '../schemas/pay-obligation-form.schema'
import { OperationLine } from './operation-line.component'

type PayObligationSheetProps = {
  obligation: ObligationRow
  onClose: () => void
}

const FORM_ID = 'pay-obligation-form'

// the screen mounts the sheet only after the options are loaded; the cache returns the same data here
const NO_OPTIONS: ObligationOptions = {
  accounts: [],
  categories: [],
}

// Figma «Saldo» → Confirm payment 2:15014 / 2:15535: summary line, Amount, Payment date, Account (hint: creates one
// actual operation), «Link an existing operation» rows with a Link button, footer Cancel + Paid.
export function PayObligationSheet({ obligation, onClose }: PayObligationSheetProps) {
  const translate = useTranslations('obligations')
  const translateErrors = useTranslations('errors')
  const format = useFormatter()
  const clock = useClock()
  const today = useToday()
  const ledgerId = useLedgerStore((ledger) => ledger.ledgerId)
  const queryClient = useQueryClient()
  const pay = usePayObligation()
  // ids are made once per open sheet: a retry after a lost answer replays the same payment instead of paying twice
  const [ids] = useState(() => ({
    paymentId: crypto.randomUUID(),
    operationId: crypto.randomUUID(),
  }))
  const candidates = useCandidateOperations(obligation.direction, true)
  const options = useObligationOptions().data ?? NO_OPTIONS
  const account =
    options.accounts.find((item) => item.id === obligation.accountId) ??
    options.accounts.find((item) => item.currency === obligation.currency) ??
    options.accounts[0]
  const suggested =
    account?.currency === obligation.currency ? (obligation.remainingMinor ?? obligation.plannedMinor) : null
  const accountName = new Map(options.accounts.map((item) => [item.id, item.name]))
  const form = useForm<z.input<typeof payObligationFormSchema>, unknown, PayObligationFormValues>({
    resolver: useZodResolver(payObligationFormSchema),
    defaultValues: {
      amount: suggested === null ? '' : fromMinor(suggested, obligation.currency),
      currency: (account?.currency ?? obligation.currency) as PayObligationFormValues['currency'],
      accountId: account?.id ?? null,
      existingOperationId: null,
      occurredOn: obligation.dueOn.localeCompare(today) <= 0 ? obligation.dueOn : today,
      settle: false,
      note: '',
    },
  })
  const currency = form.watch('currency')
  const amountText = form.watch('amount')
  const remaining = obligation.remainingMinor
  const sameCurrency = currency === obligation.currency
  const partial = remaining !== null && sameCurrency && (toMinor(amountText, currency) ?? remaining) < remaining
  const shortDate = (isoDate: string) =>
    format.dateTime(new Date(`${isoDate}T12:00:00Z`), {
      timeZone: 'UTC',
      day: '2-digit',
      month: '2-digit',
    })
  const dueLabel = shortDate(obligation.dueOn)
  const installment =
    obligation.sourceType === 'credit' && obligation.sequenceNo !== null
      ? translate(obligation.installmentTotal === null ? 'installmentNumber' : 'installment', {
          number: obligation.sequenceNo,
          total: obligation.installmentTotal ?? 0,
        })
      : null
  const kind = installment
    ? `${translate(`kind.${obligation.sourceType as 'credit'}`)}, ${installment}`
    : translate(`kind.${obligation.sourceType as 'manual'}`)

  const submit = (values: PayObligationFormValues, linked: boolean) =>
    pay.mutate(
      toPayObligationInput(values, clock, {
        ...ids,
        ledgerId,
        obligation: {
          id: obligation.id,
          version: obligation.version,
          direction: obligation.direction,
          categoryId: obligation.categoryId,
        },
      }),
      {
        onSuccess: () => {
          notify.success(translate(linked ? 'pay.linked' : 'pay.done'))
          onClose()
        },
        onError: (error) => {
          const { kind } = toPgError(error as { code?: string })

          // another person paid first: refresh at once so this screen shows their payment, and close the stale sheet
          if (kind === 'conflict') {
            queryClient.invalidateQueries({ predicate: isMoneyQuery })
            notify.error(translate('pay.alreadyPaid'))
            onClose()

            return
          }

          notify.error(translateErrors(`db.${kind}`))
        },
      },
    )

  const link = (operation: NonNullable<typeof candidates.data>[number]) => {
    const fits = remaining !== null && operation.currency === obligation.currency && operation.amountMinor > remaining
    const minor = fits ? remaining : operation.amountMinor

    submit(
      payObligationFormSchema.parse({
        amount: fromMinor(minor, operation.currency),
        currency: operation.currency,
        accountId: null,
        existingOperationId: operation.id,
        occurredOn: operation.occurredOn,
        settle: false,
        note: '',
      }),
      true,
    )
  }

  return (
    <Sheet
      open
      onOpenChange={(open) => !open && onClose()}
      title={translate('pay.title')}
      footer={
        <>
          <Button variant="secondary" type="button" onClick={onClose}>
            {translate('pay.cancel')}
          </Button>
          <Button type="submit" form={FORM_ID} disabled={pay.isPending}>
            {translate('pay.confirm')}
          </Button>
        </>
      }
    >
      <p className="text-label text-text-secondary">
        {translate('pay.summary', {
          title: obligation.title,
          kind,
          date: dueLabel,
        })}
      </p>
      <form
        id={FORM_ID}
        onSubmit={form.handleSubmit((values) => submit(values, false))}
        className="flex flex-col gap-4"
        noValidate
      >
        <FormField
          control={form.control}
          name="amount"
          label={translate('pay.amount')}
          required
          render={(field) => (
            <MoneyInput
              autoFocus
              sign={obligation.direction === 'out' ? '−' : '+'}
              value={toMinor(field.value, currency)}
              onValueChange={(minor) => field.onChange(minor === null ? '' : fromMinor(minor, currency))}
              currency={currency}
              onBlur={field.onBlur}
            />
          )}
        />
        <FormField
          control={form.control}
          name="occurredOn"
          label={translate('pay.date')}
          required
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
          label={translate('pay.account')}
          required
          hint={translate('pay.accountHint')}
          render={(field) => (
            <Select
              options={options.accounts.map((item) => ({
                value: item.id,
                label: `${item.name} · ${item.currency}`,
              }))}
              value={field.value}
              onValueChange={(next) => {
                field.onChange(next)
                const picked = options.accounts.find((item) => item.id === next)

                if (picked) {
                  form.setValue('currency', picked.currency as PayObligationFormValues['currency'])
                }
              }}
              onBlur={field.onBlur}
            />
          )}
        />
        {partial && (
          <FormField
            control={form.control}
            name="settle"
            label={translate('pay.settle')}
            hint={translate('pay.settleHint')}
            render={(field) => (
              <Switch label={translate('pay.settle')} checked={field.value} onCheckedChange={field.onChange} />
            )}
          />
        )}
      </form>
      <section className="flex flex-col gap-1">
        <h3 className="text-label font-medium text-text-secondary">{translate('pay.linkTitle')}</h3>
        <p className="text-caption text-text-tertiary">{translate('pay.linkHint')}</p>
        {(candidates.data ?? []).length === 0 && !candidates.isPending && (
          <p className="text-caption text-text-tertiary">{translate('pay.linkEmpty')}</p>
        )}
        <ul className="flex flex-col">
          {(candidates.data ?? []).map((operation) => (
            <OperationLine
              key={operation.id}
              title={operation.counterparty ?? operation.note ?? accountName.get(operation.accountId) ?? ''}
              subtitle={`${shortDate(operation.occurredOn)} · ${accountName.get(operation.accountId) ?? ''}`}
              minor={obligation.direction === 'out' ? -operation.amountMinor : operation.amountMinor}
              currency={operation.currency}
              action={
                <Button
                  size="s"
                  variant="secondary"
                  type="button"
                  disabled={pay.isPending}
                  onClick={() => link(operation)}
                >
                  {translate('pay.link')}
                </Button>
              }
            />
          ))}
        </ul>
      </section>
    </Sheet>
  )
}
