'use client'

import { useTranslations } from 'next-intl'
import { useState } from 'react'
import { FormProvider, useForm, useWatch } from 'react-hook-form'
import { useMoneyText } from '@/components/ui/amount.component'
import { Banner } from '@/components/ui/banner.component'
import { Button } from '@/components/ui/button.component'
import { DatePicker } from '@/components/ui/date-picker.component'
import { FormField } from '@/components/ui/form-field.component'
import { MoneyInput } from '@/components/ui/money-input.component'
import { Sheet, SheetClose } from '@/components/ui/sheet.component'
import { notify } from '@/components/ui/toaster.component'
import { useClock, useToday } from '@/contexts/clock.context'
import { useLedgerStore } from '@/contexts/ledger.context'
import { useDayText } from '@/lib/dates/day-text.hook'
import { useZodResolver } from '@/lib/forms/zod-resolver.hook'
import { fromMinor, toMinor } from '@/lib/money/money.utils'
import type { DebtRow } from '../api/debts.api'
import { useAddDebtMovement, useCloseDebt, useDebtAccounts } from '../hooks/debts.hook'
import { toStatusInput } from '../schemas/debt-edit-form.schema'
import { type RepaymentFormValues, repaymentFormSchema, toRepaymentInput } from '../schemas/repayment-form.schema'
import { repaymentAccountId } from '../utils/debts.utils'
import { DebtAccountField } from './debt-fields.component'

const FORM_ID = 'repayment-form'

type RepaymentSheetProps = {
  debt: DebtRow
  /** closing a debt: the amount starts as the whole remaining, and the debt is closed after it is paid */
  closing: boolean
  onCloseAction: () => void
}

// the form starts on an account (QA 12.11: with none picked a repayment moved no money), so it opens once they are in
export function RepaymentSheet({ debt, closing, onCloseAction }: RepaymentSheetProps) {
  const accounts = useDebtAccounts()

  return accounts.data ? (
    <RepaymentForm
      debt={debt}
      closing={closing}
      onCloseAction={onCloseAction}
      accountId={repaymentAccountId(debt, accounts.data)}
    />
  ) : null
}

type RepaymentFormProps = RepaymentSheetProps & {
  accountId: string | null
}

// Figma «Saldo» → Personal debts, partial repayment state, Desktop 2:63002 and close state, Desktop 2:63360: debt
// line, Amount, Date, Account (hint), result line «after the repayment …», footer Cancel + Repay.
function RepaymentForm({ debt, closing, onCloseAction, accountId }: RepaymentFormProps) {
  const translate = useTranslations('debts')
  const moneyText = useMoneyText()
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
      accountId,
      occurredOn: today,
    },
  })
  const amountText = useWatch({
    control: methods.control,
    name: 'amount',
  })
  const amount = toMinor(amountText, debt.currency)
  const left = amount === null ? null : debt.remainingMinor - amount
  const pending = repay.isPending || close.isPending
  // an overpayment stays possible (debts.utils debtBalance) but is explicit: a warning and the button says it
  let confirmKey: 'repay.confirmClose' | 'repay.confirmOver' | 'repay.confirm' = 'repay.confirm'

  if (closing) {
    confirmKey = 'repay.confirmClose'
  } else if (left !== null && left < 0) {
    confirmKey = 'repay.confirmOver'
  }

  const dayText = useDayText()

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
          <SheetClose>{translate('form.cancel')}</SheetClose>
          <Button type="submit" form={FORM_ID} disabled={pending}>
            {translate(confirmKey)}
          </Button>
        </>
      }
    >
      <p className={closing ? 'text-body text-text-primary' : 'text-label text-text-secondary'}>
        {closing
          ? translate('repay.closeText', { remaining: moneyText(debt.remainingMinor, debt.currency) })
          : translate('repay.summary', {
              reason: debt.reason ?? '',
              date: dayText(debt.arisenOn, 'short'),
              principal: moneyText(debt.principalMinor, debt.currency),
              repaid: moneyText(debt.repaidMinor, debt.currency),
              remaining: moneyText(debt.remainingMinor, debt.currency),
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
  const moneyText = useMoneyText()

  if (left === null) {
    return null
  }

  if (left < 0) {
    return <Banner kind="warning">{translate('repay.resultOver', { amount: moneyText(-left, currency) })}</Banner>
  }

  if (left === 0) {
    return <p className="text-label text-text-secondary">{translate('repay.resultDone')}</p>
  }

  return (
    <p className="text-label font-medium text-text-primary">
      {translate('repay.result', { amount: moneyText(left, currency) })}
    </p>
  )
}
