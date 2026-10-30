'use client'

import { useQueryClient } from '@tanstack/react-query'
import { useFormatter, useTranslations } from 'next-intl'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import type { z } from 'zod'
import { Amount } from '@/components/ui/amount.component'
import { Button } from '@/components/ui/button.component'
import { DatePicker } from '@/components/ui/date-picker.component'
import { FormField } from '@/components/ui/form-field.component'
import { MoneyInput } from '@/components/ui/money-input.component'
import { Select } from '@/components/ui/select.component'
import { Sheet } from '@/components/ui/sheet.component'
import { Switch } from '@/components/ui/switch.component'
import { notify } from '@/components/ui/toaster.component'
import { isMoneyQuery } from '@/constants/query-roots.constants'
import { useClock } from '@/contexts/clock.context'
import { useLedger } from '@/contexts/ledger.context'
import { useZodResolver } from '@/lib/forms/zod-resolver.hook'
import { fromMinor, toMinor } from '@/lib/money/money.utils'
import { toPgError } from '@/lib/supabase/pg-error.utils'
import { localDate } from '@/lib/utils/clock.utils'
import type { ObligationOptions, ObligationRow } from '../api/obligations.api'
import { useCandidateOperations, usePayObligation } from '../hooks/obligations.hook'
import {
  type PayObligationFormValues,
  payObligationFormSchema,
  toPayObligationInput,
} from '../schemas/pay-obligation-form.schema'

type PayObligationSheetProps = {
  obligation: ObligationRow
  options: ObligationOptions
  onClose: () => void
}

const FORM_ID = 'pay-obligation-form'

// Figma «Saldo» → Confirm payment 2:15014 / 2:15535: summary line, Amount, Payment date, Account (hint: creates one
// actual operation), «Link an existing operation» rows with a Link button, footer Cancel + Paid.
export function PayObligationSheet({ obligation, options, onClose }: PayObligationSheetProps) {
  const translate = useTranslations('obligations')
  const translateErrors = useTranslations('errors')
  const format = useFormatter()
  const clock = useClock()
  const { ledgerId } = useLedger()
  const queryClient = useQueryClient()
  const pay = usePayObligation()
  // ids are made once per open sheet: a retry after a lost answer replays the same payment instead of paying twice
  const [ids] = useState(() => ({
    paymentId: crypto.randomUUID(),
    operationId: crypto.randomUUID(),
  }))
  const candidates = useCandidateOperations(obligation.direction, true)
  const today = localDate(clock.now(), clock.timeZone)
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
  const dueLabel = format.dateTime(new Date(`${obligation.dueOn}T12:00:00Z`), {
    timeZone: 'UTC',
    day: '2-digit',
    month: '2-digit',
  })

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
      <p className="text-body text-text-secondary">
        {translate('pay.summary', {
          title: obligation.title,
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
      <section className="flex flex-col gap-2">
        <h3 className="text-label font-medium text-text-primary">{translate('pay.linkTitle')}</h3>
        <p className="text-caption text-text-secondary">{translate('pay.linkHint')}</p>
        {(candidates.data ?? []).length === 0 && !candidates.isPending && (
          <p className="text-caption text-text-tertiary">{translate('pay.linkEmpty')}</p>
        )}
        <ul className="flex flex-col gap-3">
          {(candidates.data ?? []).map((operation) => (
            <li key={operation.id} className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 flex-col">
                <span className="truncate text-body font-medium text-text-primary">
                  {operation.counterparty ?? operation.note ?? accountName.get(operation.accountId)}
                </span>
                <span className="text-caption text-text-secondary">
                  {operation.occurredOn} · {accountName.get(operation.accountId)}
                </span>
              </div>
              <Amount minor={operation.amountMinor} currency={operation.currency} />
              <Button
                size="s"
                variant="secondary"
                type="button"
                disabled={pay.isPending}
                onClick={() => link(operation)}
              >
                {translate('pay.link')}
              </Button>
            </li>
          ))}
        </ul>
      </section>
    </Sheet>
  )
}
