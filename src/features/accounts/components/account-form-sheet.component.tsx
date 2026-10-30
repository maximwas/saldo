'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslations } from 'next-intl'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button.component'
import { DatePicker } from '@/components/ui/date-picker.component'
import { FormField } from '@/components/ui/form-field.component'
import { Input } from '@/components/ui/input.component'
import { MoneyInput } from '@/components/ui/money-input.component'
import { Select } from '@/components/ui/select.component'
import { Sheet } from '@/components/ui/sheet.component'
import { notify } from '@/components/ui/toaster.component'
import { CURRENCIES } from '@/constants/currencies.constants'
import { useClock } from '@/contexts/clock.context'
import { useLedger } from '@/contexts/ledger.context'
import { localDate } from '@/lib/utils/clock.utils'
import { useCreateAccount, useUpdateAccount } from '../hooks/accounts.hook'
import {
  type AccountFormInput,
  type AccountFormValues,
  accountFormSchema,
  toCreateAccountInput,
  toUpdateAccountInput,
} from '../schemas/account-form.schema'
import { ACCOUNT_KINDS, type AccountView } from '../utils/accounts.utils'

const FORM_ID = 'account-form'

type AccountFormSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** the account being edited; null = a new one */
  account: AccountView | null
  baseCurrency: string
  sortOrder: number
}

// Figma «Saldo» → · 5:106946 (Dialog: title, hint, Name / Type / Currency, Cancel + Save); the
// create form adds the opening balance and its date (spec §5: the opening balance is a field of the account, not income)
export function AccountFormSheet({ open, onOpenChange, account, baseCurrency, sortOrder }: AccountFormSheetProps) {
  const translate = useTranslations('accounts')
  const { ledgerId } = useLedger()
  const create = useCreateAccount()
  const update = useUpdateAccount()
  const pending = create.isPending || update.isPending

  const done = () => {
    notify.success(translate('form.saved'))
    onOpenChange(false)
  }

  const submit = (values: AccountFormValues, newId: string) => {
    if (account) {
      update.mutate(
        toUpdateAccountInput(values, {
          id: account.id,
          expectedVersion: account.version,
        }),
        {
          onSuccess: done,
        },
      )

      return
    }

    create.mutate(
      toCreateAccountInput(values, {
        id: newId,
        ledgerId,
        sortOrder,
      }),
      { onSuccess: done },
    )
  }

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={translate(account ? 'form.editTitle' : 'form.createTitle')}
      footer={
        <>
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            {translate('form.cancel')}
          </Button>
          <Button type="submit" form={FORM_ID} disabled={pending}>
            {translate('form.save')}
          </Button>
        </>
      }
    >
      <AccountForm account={account} baseCurrency={baseCurrency} onSubmitAction={submit} />
    </Sheet>
  )
}

type AccountFormProps = {
  account: AccountView | null
  baseCurrency: string
  onSubmitAction: (values: AccountFormValues, newId: string) => void
}

// mounted only while the sheet is open, so every opening starts from clean defaults
function AccountForm({ account, baseCurrency, onSubmitAction }: AccountFormProps) {
  const translate = useTranslations('accounts')
  const translateCurrency = useTranslations('currencies')
  const clock = useClock()
  // one id per opened form: a double click on «Save» sends the same id, so it is one account
  const [newId] = useState(() => crypto.randomUUID())
  const form = useForm<AccountFormInput, unknown, AccountFormValues>({
    resolver: zodResolver(accountFormSchema),
    defaultValues: {
      name: account?.name ?? '',
      kind: account?.kind ?? 'bank',
      currency: (account?.currency ?? baseCurrency) as AccountFormInput['currency'],
      openingBalanceMinor: account?.openingBalanceMinor ?? null,
      openingOn: account?.openingBalanceOn ?? localDate(clock.now(), clock.timeZone),
    },
  })
  const currency = form.watch('currency')

  return (
    <form
      id={FORM_ID}
      noValidate
      onSubmit={form.handleSubmit((values) => onSubmitAction(values, newId))}
      className="flex flex-col gap-4"
    >
      {account ? <p className="text-label text-text-secondary">{translate('form.editHint')}</p> : null}
      <FormField
        control={form.control}
        name="name"
        label={translate('form.name')}
        render={(field) => <Input {...field} autoComplete="off" />}
      />
      <FormField
        control={form.control}
        name="kind"
        label={translate('form.kind')}
        render={(field) => (
          <Select
            name={field.name}
            value={field.value}
            onValueChange={field.onChange}
            onBlur={field.onBlur}
            options={ACCOUNT_KINDS.map((kind) => ({
              value: kind,
              label: translate(`kind.${kind}`),
            }))}
          />
        )}
      />
      <FormField
        control={form.control}
        name="currency"
        label={translate('form.currency')}
        hint={account ? translate('form.currencyLocked') : undefined}
        render={(field) => (
          <Select
            name={field.name}
            value={field.value}
            onValueChange={field.onChange}
            onBlur={field.onBlur}
            disabled={account !== null}
            options={CURRENCIES.map((code) => ({
              value: code,
              label: `${translateCurrency(`names.${code}`)} (${code})`,
            }))}
          />
        )}
      />
      {account ? null : (
        <>
          <FormField
            control={form.control}
            name="openingBalanceMinor"
            label={translate('form.openingBalance')}
            render={(field) => (
              <MoneyInput
                ref={field.ref}
                name={field.name}
                value={field.value}
                onValueChange={field.onChange}
                onBlur={field.onBlur}
                currency={currency}
                placeholder="0,00"
              />
            )}
          />
          <FormField
            control={form.control}
            name="openingOn"
            label={translate('form.openingOn')}
            render={(field) => (
              <DatePicker name={field.name} value={field.value} onValueChange={field.onChange} onBlur={field.onBlur} />
            )}
          />
        </>
      )}
    </form>
  )
}
