'use client'

import { useTranslations } from 'next-intl'
import { useState } from 'react'
import { FormProvider, useForm, useFormContext } from 'react-hook-form'
import { ReminderRuleCard } from '@/components/reminders/reminder-rule-card.component'
import { Amount } from '@/components/ui/amount.component'
import { Button } from '@/components/ui/button.component'
import { DatePicker } from '@/components/ui/date-picker.component'
import { FormField } from '@/components/ui/form-field.component'
import { MoneyInput } from '@/components/ui/money-input.component'
import { SegmentedControl } from '@/components/ui/segmented-control.component'
import { Select } from '@/components/ui/select.component'
import { Sheet } from '@/components/ui/sheet.component'
import { notify } from '@/components/ui/toaster.component'
import { CURRENCIES } from '@/constants/currencies.constants'
import { useClock, useToday } from '@/contexts/clock.context'
import { useLedgerStore } from '@/contexts/ledger.context'
import { useZodResolver } from '@/lib/forms/zod-resolver.hook'
import { fromMinor, toMinor } from '@/lib/money/money.utils'
import type { DebtRow } from '../api/debts.api'
import { useDebts, usePurchases, useSaveDebt } from '../hooks/debts.hook'
import { type DebtEditFormValues, debtEditFormSchema, toEditDebtInput } from '../schemas/debt-edit-form.schema'
import { DEBT_ORIGINS, type DebtFormValues, debtFormSchema, toCreateDebtInput } from '../schemas/debt-form.schema'
import { ownShareMinor } from '../utils/debts.utils'
import { DebtAccountField, DebtDueNoteFields, DebtPersonFields } from './debt-fields.component'

const FORM_ID = 'debt-form'

type DebtFormSheetProps = {
  /** the debt being edited; null = a new one */
  debt: DebtRow | null
  onCloseAction: () => void
}

// Figma «Saldo» → Personal debts, edit state, Desktop 2:64688 (edit); a new debt has no frame of its own and is
// built from the same primitives: origin (money moves / old debt / purchase share), person, amount, account, dates.
export function DebtFormSheet({ debt, onCloseAction }: DebtFormSheetProps) {
  return debt ? (
    <EditDebtSheet debt={debt} onCloseAction={onCloseAction} />
  ) : (
    <CreateDebtSheet onCloseAction={onCloseAction} />
  )
}

type DebtSheetFrameProps = {
  title: string
  pending: boolean
  onCloseAction: () => void
  children: React.ReactNode
}

function DebtSheetFrame({ title, pending, onCloseAction, children }: DebtSheetFrameProps) {
  const translate = useTranslations('debts')

  return (
    <Sheet
      open
      onOpenChange={(open) => !open && onCloseAction()}
      title={title}
      footer={
        <>
          <Button variant="secondary" type="button" onClick={onCloseAction}>
            {translate('form.cancel')}
          </Button>
          <Button type="submit" form={FORM_ID} disabled={pending}>
            {translate('form.save')}
          </Button>
        </>
      }
    >
      {children}
    </Sheet>
  )
}

type EditDebtSheetProps = {
  debt: DebtRow
  onCloseAction: () => void
}

function EditDebtSheet({ debt, onCloseAction }: EditDebtSheetProps) {
  const translate = useTranslations('debts')
  const ledgerId = useLedgerStore((ledger) => ledger.ledgerId)
  const save = useSaveDebt()
  const methods = useForm<DebtEditFormValues>({
    resolver: useZodResolver(debtEditFormSchema),
    defaultValues: {
      person: debt.person,
      reason: debt.reason ?? '',
      accountId: debt.accountId,
      dueOn: debt.dueOn,
      note: debt.note ?? '',
    },
  })

  const submit = (values: DebtEditFormValues) =>
    save.mutate(toEditDebtInput(values, debt, ledgerId), {
      onSuccess: () => {
        notify.success(translate('form.saved'))
        onCloseAction()
      },
    })

  return (
    <DebtSheetFrame title={translate('form.editTitle')} pending={save.isPending} onCloseAction={onCloseAction}>
      <p className="text-label text-text-secondary">{translate('form.editHint')}</p>
      <FormProvider {...methods}>
        <form id={FORM_ID} noValidate onSubmit={methods.handleSubmit(submit)} className="flex flex-col gap-4">
          <DebtPersonFields />
          <DebtAccountField label={translate('form.account')} optional currency={debt.currency} />
          <DebtDueNoteFields />
        </form>
      </FormProvider>
      <ReminderRuleCard sourceType="debt" sourceId={debt.id} />
    </DebtSheetFrame>
  )
}

function CreateDebtSheet({ onCloseAction }: { onCloseAction: () => void }) {
  const translate = useTranslations('debts')
  const ledgerId = useLedgerStore((ledger) => ledger.ledgerId)
  const baseCurrency = useLedgerStore((ledger) => ledger.baseCurrency)
  const clock = useClock()
  const today = useToday()
  const save = useSaveDebt()
  // ids are made once per open sheet: a double click or a retry after a lost answer replays the same debt
  const [ids] = useState(() => ({
    debtId: crypto.randomUUID(),
    operationId: crypto.randomUUID(),
  }))
  const methods = useForm<DebtFormValues>({
    resolver: useZodResolver(debtFormSchema),
    defaultValues: {
      origin: 'new_movement',
      direction: 'owed_to_me',
      person: '',
      reason: '',
      amount: '',
      currency: baseCurrency as DebtFormValues['currency'],
      accountId: null,
      arisenOn: today,
      dueOn: null,
      purchaseId: null,
      note: '',
    },
  })

  const submit = (values: DebtFormValues) =>
    save.mutate(
      toCreateDebtInput(values, clock, {
        ...ids,
        ledgerId,
      }),
      {
        onSuccess: () => {
          notify.success(translate('form.saved'))
          onCloseAction()
        },
      },
    )

  return (
    <DebtSheetFrame title={translate('form.createTitle')} pending={save.isPending} onCloseAction={onCloseAction}>
      <FormProvider {...methods}>
        <form id={FORM_ID} noValidate onSubmit={methods.handleSubmit(submit)} className="flex flex-col gap-4">
          <OriginFields />
          <DebtPersonFields />
          <AmountFields />
          <DebtDueNoteFields />
        </form>
      </FormProvider>
    </DebtSheetFrame>
  )
}

function OriginFields() {
  const translate = useTranslations('debts')
  const { watch, setValue } = useFormContext<DebtFormValues>()
  const origin = watch('origin')
  const direction = watch('direction')

  return (
    <>
      <SegmentedControl
        label={translate('form.origin')}
        options={DEBT_ORIGINS.map((value) => ({
          value,
          label: translate(`form.origins.${value}`),
        }))}
        value={origin}
        onValueChange={(next) => {
          setValue('origin', next)
          setValue('accountId', null)
          setValue('purchaseId', null)
        }}
      />
      <p className="text-caption text-text-secondary">{translate(`form.originHints.${origin}`)}</p>
      {origin === 'purchase_share' ? null : (
        <SegmentedControl
          label={translate('form.direction')}
          options={(['owed_to_me', 'i_owe'] as const).map((value) => ({
            value,
            label: translate(`form.directions.${value}`),
          }))}
          value={direction}
          onValueChange={(next) => setValue('direction', next)}
        />
      )}
    </>
  )
}

// amount, currency (set by the account or the purchase where there is one), account, purchase and the date
function AmountFields() {
  const translate = useTranslations('debts')
  const { watch, setValue, control } = useFormContext<DebtFormValues>()
  const origin = watch('origin')
  const currency = watch('currency')
  const amount = watch('amount')
  const purchaseId = watch('purchaseId')
  const purchases = usePurchases(origin === 'purchase_share')
  const debts = useDebts()
  const purchase = purchases.data?.find((item) => item.id === purchaseId)
  const shareMinor = toMinor(amount, currency)

  return (
    <>
      {origin === 'purchase_share' && (
        <FormField
          control={control}
          name="purchaseId"
          label={translate('form.purchase')}
          hint={purchases.data?.length === 0 ? translate('form.purchaseEmpty') : translate('form.purchaseHint')}
          render={(field) => (
            <Select
              options={(purchases.data ?? []).map((item) => ({
                value: item.id,
                label: `${item.occurredOn} · ${item.label || '—'} · ${fromMinor(item.amountMinor, item.currency)} ${item.currency}`,
              }))}
              value={field.value}
              onValueChange={(next) => {
                field.onChange(next)

                const picked = purchases.data?.find((item) => item.id === next)

                if (picked) {
                  setValue('currency', picked.currency)
                }
              }}
              onBlur={field.onBlur}
            />
          )}
        />
      )}
      <FormField
        control={control}
        name="amount"
        label={translate('form.amount')}
        required
        render={(field) => (
          <MoneyInput
            value={toMinor(field.value, currency)}
            onValueChange={(minor) => field.onChange(minor === null ? '' : fromMinor(minor, currency))}
            currency={currency}
            onBlur={field.onBlur}
          />
        )}
      />
      {origin === 'existing_no_movement' && (
        <FormField
          control={control}
          name="currency"
          label={translate('form.currency')}
          render={(field) => (
            <Select
              options={CURRENCIES.map((code) => ({
                value: code,
                label: code,
              }))}
              value={field.value}
              onValueChange={(next) => next && field.onChange(next)}
              onBlur={field.onBlur}
            />
          )}
        />
      )}
      {origin === 'purchase_share' && purchase && shareMinor !== null ? (
        <p className="text-label text-text-secondary">
          {translate('form.purchaseOwn')}
          <Amount
            minor={ownShareMinor(
              {
                id: purchase.id,
                amountMinor: purchase.amountMinor,
              },
              [
                ...(debts.data ?? []),
                {
                  direction: 'owed_to_me',
                  principalMinor: shareMinor,
                  shareOfOperationId: purchase.id,
                },
              ],
            )}
            currency={purchase.currency}
            className="text-label font-medium"
          />
        </p>
      ) : null}
      {origin === 'purchase_share' ? null : (
        <DebtAccountField
          label={translate(origin === 'new_movement' ? 'form.accountNew' : 'form.account')}
          optional={origin !== 'new_movement'}
          onPickedAction={(account) =>
            origin === 'new_movement' && setValue('currency', account.currency as DebtFormValues['currency'])
          }
        />
      )}
      <FormField
        control={control}
        name="arisenOn"
        label={translate('form.arisenOn')}
        required
        render={(field) => (
          <DatePicker value={field.value} onValueChange={(next) => field.onChange(next ?? '')} onBlur={field.onBlur} />
        )}
      />
    </>
  )
}
