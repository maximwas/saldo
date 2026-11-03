'use client'

import { useQueryClient } from '@tanstack/react-query'
import type { Route } from 'next'
import { usePathname, useRouter } from 'next/navigation'
import { useFormatter, useTranslations } from 'next-intl'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import type { z } from 'zod'
import { Button } from '@/components/ui/button.component'
import { DatePicker } from '@/components/ui/date-picker.component'
import { FormField } from '@/components/ui/form-field.component'
import { MoneyInput } from '@/components/ui/money-input.component'
import { Select } from '@/components/ui/select.component'
import { Sheet, SheetClose } from '@/components/ui/sheet.component'
import { SkeletonLine } from '@/components/ui/skeleton.component'
import { Switch } from '@/components/ui/switch.component'
import { notify } from '@/components/ui/toaster.component'
import { isMoneyQuery } from '@/constants/query-roots.constants'
import { useClock, useToday } from '@/contexts/clock.context'
import { useLedgerStore } from '@/contexts/ledger.context'
import { useZodResolver } from '@/lib/forms/zod-resolver.hook'
import { fromMinor, toMinor } from '@/lib/money/money.utils'
import { useDbErrorText } from '@/lib/supabase/db-error-text.hook'
import { toPgError } from '@/lib/supabase/pg-error.utils'
import type { ObligationOptions, ObligationRow } from '../api/obligations.api'
import { useCandidateOperations, useObligationOptions, usePayObligation } from '../hooks/obligations.hook'
import {
  type PayObligationFormValues,
  payFormDefaults,
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

// Figma «Saldo» → Pay step 55:127451 / 56:127816 (and Confirm payment 2:15014 / 2:15535 for the links): «Pay <name>»,
// «Planned for 10.11», Amount, Payment date (today by default, «Today, 03.11», hint: the entry lands on that date),
// Account (hint: the money leaves it), «Link an existing operation» rows with a Link button, footer Cancel + Paid. The
// toast says where the fact went and «Show» opens that day in the calendar (55:127506).
export function PayObligationSheet({ obligation, onClose }: PayObligationSheetProps) {
  const translate = useTranslations('obligations')
  const dbErrorText = useDbErrorText()
  const format = useFormatter()
  const clock = useClock()
  const today = useToday()
  const ledgerId = useLedgerStore((ledger) => ledger.ledgerId)
  const queryClient = useQueryClient()
  const router = useRouter()
  const pathname = usePathname()
  const pay = usePayObligation()
  // ids are made once per open sheet: a retry after a lost answer replays the same payment instead of paying twice
  const [ids] = useState(() => ({
    paymentId: crypto.randomUUID(),
    operationId: crypto.randomUUID(),
  }))
  const candidates = useCandidateOperations(obligation.direction, true)
  const options = useObligationOptions().data ?? NO_OPTIONS
  const accountName = new Map(options.accounts.map((item) => [item.id, item.name]))
  const form = useForm<z.input<typeof payObligationFormSchema>, unknown, PayObligationFormValues>({
    resolver: useZodResolver(payObligationFormSchema),
    defaultValues: payFormDefaults(obligation, options.accounts, today),
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

  // on the calendar «Show» keeps its view and filters; from anywhere else it opens the calendar on that day
  const showDay = (day: string) => {
    const params = new URLSearchParams(pathname === '/calendar' ? window.location.search : '')

    params.set('date', day)
    params.delete('item')
    router.push(`/calendar?${params}` as Route)
  }

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
          if (linked) {
            notify.success(translate('pay.linked'))
          } else {
            notify.success(translate('pay.done', { date: shortDate(values.occurredOn) }), {
              label: translate('pay.show'),
              onAction: () => showDay(values.occurredOn),
            })
          }

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

          notify.error(dbErrorText(error))
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
      title={translate('pay.title', { title: obligation.title })}
      footer={
        <>
          <SheetClose>{translate('pay.cancel')}</SheetClose>
          <Button type="submit" form={FORM_ID} disabled={pay.isPending}>
            {translate('pay.confirm')}
          </Button>
        </>
      }
    >
      <p className="text-label text-text-secondary">
        {translate('pay.summary', { date: shortDate(obligation.dueOn) })}
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
          hint={translate('pay.dateHint')}
          render={(field) => (
            <DatePicker
              todayLabel
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
          hint={translate('pay.accountHint', { direction: obligation.direction })}
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
        <ul className="flex flex-col" aria-busy={candidates.isPending}>
          {candidates.isPending &&
            [0, 1].map((row) => (
              <li key={row} className="py-3">
                <SkeletonLine end="w-20" />
              </li>
            ))}
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
