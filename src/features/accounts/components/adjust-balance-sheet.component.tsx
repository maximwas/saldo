'use client'

import { useLocale, useTranslations } from 'next-intl'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Amount } from '@/components/ui/amount.component'
import { Button } from '@/components/ui/button.component'
import { FormField } from '@/components/ui/form-field.component'
import { MoneyInput } from '@/components/ui/money-input.component'
import { Sheet } from '@/components/ui/sheet.component'
import { Textarea } from '@/components/ui/textarea.component'
import { notify } from '@/components/ui/toaster.component'
import { useClock, useToday } from '@/contexts/clock.context'
import { useLedgerStore } from '@/contexts/ledger.context'
import { useZodResolver } from '@/lib/forms/zod-resolver.hook'
import { formatMinor, fromMinor, toMinor } from '@/lib/money/money.utils'
import { useAdjustBalance } from '../hooks/accounts.hook'
import { type AdjustmentFormValues, adjustmentFormSchema, toAdjustmentInput } from '../schemas/adjustment-form.schema'
import { type AccountView, adjustmentOf } from '../utils/accounts.utils'

const FORM_ID = 'adjust-balance-form'

type AdjustBalanceSheetProps = {
  account: AccountView
  onCloseAction: () => void
}

// Figma Saldo → balance adjustment 14:75082: the account and its balance in Saldo now, the actual balance, the
// difference to be written (a neutral row: not income, not spending), a required note; Cancel + Record.
// shortcut: the actual balance is 0 or more (MoneyInput has no minus); a negative one is entered as an operation.
export function AdjustBalanceSheet({ account, onCloseAction }: AdjustBalanceSheetProps) {
  const translate = useTranslations('accounts.adjust')
  const locale = useLocale()
  const clock = useClock()
  const today = useToday()
  const ledgerId = useLedgerStore((ledger) => ledger.ledgerId)
  const adjust = useAdjustBalance()
  // one id per open sheet: a retry after a lost answer writes the same adjustment
  const [id] = useState(() => crypto.randomUUID())
  const currency = account.currency as AdjustmentFormValues['currency']
  const form = useForm<AdjustmentFormValues>({
    resolver: useZodResolver(adjustmentFormSchema),
    defaultValues: {
      actual: '',
      currency,
      currentMinor: account.balanceMinor,
      occurredOn: today,
      note: '',
    },
  })
  const actualMinor = toMinor(form.watch('actual'), currency)
  const change = actualMinor === null ? null : adjustmentOf(account.balanceMinor, actualMinor)

  const submit = (values: AdjustmentFormValues) =>
    adjust.mutate(
      toAdjustmentInput(values, clock, {
        id,
        ledgerId,
        accountId: account.id,
      }),
      {
        onSuccess: () => {
          notify.success(translate('done'))
          onCloseAction()
        },
      },
    )

  return (
    <Sheet
      open
      onOpenChange={(open) => !open && onCloseAction()}
      title={translate('title')}
      footer={
        <>
          <Button variant="secondary" type="button" onClick={onCloseAction}>
            {translate('cancel')}
          </Button>
          <Button type="submit" form={FORM_ID} disabled={adjust.isPending}>
            {translate('submit')}
          </Button>
        </>
      }
    >
      <p className="text-body text-text-secondary">
        {translate('now', {
          account: account.name,
          amount: formatMinor(account.balanceMinor, currency, locale),
        })}
      </p>
      <form id={FORM_ID} noValidate onSubmit={form.handleSubmit(submit)} className="flex flex-col gap-4">
        <FormField
          control={form.control}
          name="actual"
          label={translate('actual')}
          render={(field) => (
            <MoneyInput
              autoFocus
              value={toMinor(field.value, currency)}
              onValueChange={(minor) => field.onChange(minor === null ? '' : fromMinor(minor, currency))}
              currency={currency}
              onBlur={field.onBlur}
              ref={field.ref}
            />
          )}
        />
        <div className="flex items-baseline justify-between gap-4">
          <span className="text-label text-text-secondary">{translate('difference')}</span>
          {change ? (
            <span className="text-body font-medium text-text-primary">
              {change.direction === 'in' ? '+' : null}
              <Amount
                minor={change.direction === 'in' ? change.amountMinor : -change.amountMinor}
                currency={currency}
              />
            </span>
          ) : (
            <span className="text-body text-text-tertiary">—</span>
          )}
        </div>
        <FormField
          control={form.control}
          name="note"
          label={translate('note')}
          hint={translate('noteHint')}
          render={(field) => <Textarea {...field} />}
        />
      </form>
    </Sheet>
  )
}
