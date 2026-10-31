'use client'

import { useFormatter, useLocale, useTranslations } from 'next-intl'
import { useState } from 'react'
import { FormProvider, useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button.component'
import { DatePicker } from '@/components/ui/date-picker.component'
import { FormField } from '@/components/ui/form-field.component'
import { MoneyInput } from '@/components/ui/money-input.component'
import { Sheet } from '@/components/ui/sheet.component'
import { notify } from '@/components/ui/toaster.component'
import { useClock, useToday } from '@/contexts/clock.context'
import { useLedgerStore } from '@/contexts/ledger.context'
import { useZodResolver } from '@/lib/forms/zod-resolver.hook'
import { formatMinor, fromMinor, toMinor } from '@/lib/money/money.utils'
import type { DebtRow } from '../api/debts.api'
import { useAddDebtMovement, useCloseDebt } from '../hooks/debts.hook'
import { toStatusInput } from '../schemas/debt-edit-form.schema'
import { type RepaymentFormValues, repaymentFormSchema, toRepaymentInput } from '../schemas/repayment-form.schema'
import { DebtAccountField } from './debt-fields.component'

const FORM_ID = 'repayment-form'

type RepaymentSheetProps = {
  debt: DebtRow
  /** closing a debt: the amount starts as the whole remaining, and the debt is closed after it is paid */
  closing: boolean
  onCloseAction: () => void
}

// Figma «Saldo» → Personal debts, partial repayment state, Desktop 2:63002 and close state, Desktop 2:63360: debt
// line, Amount, Date, Account (hint), result line «after the repayment …», footer Cancel + Repay.
export function RepaymentSheet({ debt, closing, onCloseAction }: RepaymentSheetProps) {
  const translate = useTranslations('debts')
  const locale = useLocale()
  const clock = useClock()
  const today = useToday()
  const ledgerId = useLedgerStore((ledger) => ledger.ledgerId)
  const repay = useAddDebtMovement()
  const close = useCloseDebt()
  // ids are made once per open sheet: a retry after a lost answer replays the same repayment
  const [ids] = useState(() => ({
    movementId: crypto.randomUUID(),
    operationId: crypto.randomUUID(),
  }))
  const methods = useForm<RepaymentFormValues>({
    resolver: useZodResolver(repaymentFormSchema),
    defaultValues: {
      amount: closing ? fromMinor(debt.remainingMinor, debt.currency) : '',
      currency: debt.currency,
      accountId: debt.accountId,
      occurredOn: today,
    },
  })
  const amount = toMinor(methods.watch('amount'), debt.currency)
  const left = amount === null ? null : debt.remainingMinor - amount
  const pending = repay.isPending || close.isPending
  const format = useFormatter()
  const dayText = (iso: string) =>
    format.dateTime(new Date(`${iso}T12:00:00Z`), {
      timeZone: 'UTC',
      day: '2-digit',
      month: '2-digit',
    })

  const submit = (values: RepaymentFormValues) => {
    const repayment = toRepaymentInput(values, clock, {
      ...ids,
      ledgerId,
      debt,
    })
    const done = () => {
      notify.success(translate(closing ? 'repay.closed' : 'repay.done'))
      onCloseAction()
    }

    if (closing) {
      close.mutate(
        {
          repayment,
          status: toStatusInput(debt, 'settled', ledgerId),
        },
        { onSuccess: done },
      )

      return
    }

    repay.mutate(repayment, { onSuccess: done })
  }

  return (
    <Sheet
      open
      onOpenChange={(open) => !open && onCloseAction()}
      title={translate(closing ? 'repay.titleClose' : 'repay.title')}
      footer={
        <>
          <Button variant="secondary" type="button" onClick={onCloseAction}>
            {translate('form.cancel')}
          </Button>
          <Button type="submit" form={FORM_ID} disabled={pending}>
            {translate(closing ? 'repay.confirmClose' : 'repay.confirm')}
          </Button>
        </>
      }
    >
      <p className={closing ? 'text-body text-text-primary' : 'text-label text-text-secondary'}>
        {closing
          ? translate('repay.closeText', { remaining: formatMinor(debt.remainingMinor, debt.currency, locale) })
          : translate('repay.summary', {
              reason: debt.reason ?? '',
              date: dayText(debt.arisenOn),
              principal: formatMinor(debt.principalMinor, debt.currency, locale),
              repaid: formatMinor(debt.repaidMinor, debt.currency, locale),
              remaining: formatMinor(debt.remainingMinor, debt.currency, locale),
            })}
      </p>
      <FormProvider {...methods}>
        <form id={FORM_ID} noValidate onSubmit={methods.handleSubmit(submit)} className="flex flex-col gap-4">
          <FormField
            control={methods.control}
            name="amount"
            label={translate('repay.amount')}
            required
            render={(field) => (
              <MoneyInput
                autoFocus
                sign={debt.direction === 'owed_to_me' ? '+' : '−'}
                value={toMinor(field.value, debt.currency)}
                onValueChange={(minor) => field.onChange(minor === null ? '' : fromMinor(minor, debt.currency))}
                currency={debt.currency}
                onBlur={field.onBlur}
              />
            )}
          />
          <FormField
            control={methods.control}
            name="occurredOn"
            label={translate('repay.date')}
            required
            render={(field) => (
              <DatePicker
                value={field.value}
                onValueChange={(next) => field.onChange(next ?? '')}
                onBlur={field.onBlur}
              />
            )}
          />
          <DebtAccountField
            label={translate(debt.direction === 'owed_to_me' ? 'repay.accountIn' : 'repay.accountOut')}
            hint={translate(debt.direction === 'owed_to_me' ? 'repay.hintIn' : 'repay.hintOut')}
            optional
            currency={debt.currency}
          />
        </form>
      </FormProvider>
      <RepaymentResult left={left} currency={debt.currency} />
    </Sheet>
  )
}

type RepaymentResultProps = {
  /** what remains after the repayment; null while the amount is empty */
  left: number | null
  currency: DebtRow['currency']
}

function RepaymentResult({ left, currency }: RepaymentResultProps) {
  const translate = useTranslations('debts')
  const locale = useLocale()

  if (left === null) {
    return null
  }

  if (left < 0) {
    return (
      <p className="text-label text-text-secondary">
        {translate('repay.resultOver', { amount: formatMinor(-left, currency, locale) })}
      </p>
    )
  }

  if (left === 0) {
    return <p className="text-label text-text-secondary">{translate('repay.resultDone')}</p>
  }

  return (
    <p className="text-label font-medium text-text-primary">
      {translate('repay.result', { amount: formatMinor(left, currency, locale) })}
    </p>
  )
}
