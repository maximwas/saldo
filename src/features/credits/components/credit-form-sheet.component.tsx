'use client'

import { useTranslations } from 'next-intl'
import { useState } from 'react'
import { FormProvider, useForm } from 'react-hook-form'
import type { z } from 'zod'
import { Button } from '@/components/ui/button.component'
import { FormField } from '@/components/ui/form-field.component'
import { Input } from '@/components/ui/input.component'
import { SegmentedControl } from '@/components/ui/segmented-control.component'
import { Select } from '@/components/ui/select.component'
import { Sheet } from '@/components/ui/sheet.component'
import { notify } from '@/components/ui/toaster.component'
import { CURRENCIES } from '@/constants/currencies.constants'
import { useToday } from '@/contexts/clock.context'
import { useLedgerStore } from '@/contexts/ledger.context'
import { useZodResolver } from '@/lib/forms/zod-resolver.hook'
import { fromMinor } from '@/lib/money/money.utils'
import type { Credit } from '../api/credits.api'
import { useCredits, useSaveCredit } from '../hooks/credits.hook'
import { CREDIT_MODES, type CreditFormValues, creditFormSchema, toSaveCreditInput } from '../schemas/credit-form.schema'
import { EqualFields, ExistingFields, MoneyField, ScheduleFields } from './credit-form-fields.component'

type CreditFormSheetProps = {
  /** null = create */
  credit: Credit | null
  onCloseAction: () => void
}

type FormInput = z.input<typeof creditFormSchema>

const FORM_ID = 'credit-form'

function defaultsOf(credit: Credit | null, today: string, baseCurrency: string): FormInput {
  const currency = (credit?.currency ?? baseCurrency) as FormInput['currency']

  return {
    mode: credit ? 'edit' : 'equal',
    name: credit?.name ?? '',
    lender: credit?.lender ?? '',
    currency,
    accountId: credit?.accountId ?? null,
    price: credit?.purchasePriceMinor == null ? '' : fromMinor(credit.purchasePriceMinor, currency),
    total: '',
    count: '',
    firstOn: today,
    remaining: '',
    installment: '',
    paidCount: '0',
    rows: [],
  }
}

const MODE_FIELDS = {
  equal: EqualFields,
  existing: ExistingFields,
  schedule: ScheduleFields,
  edit: () => null,
}

// Figma «Saldo» → Credit card · Edit 2:57906 (dialog on desktop, sheet on mobile). The create form has no
// frame: the same fields plus the three ways of §9 in a SegmentedControl. An edit changes the descriptive fields only;
// the schedule changes through early repayment.
export function CreditFormSheet({ credit, onCloseAction }: CreditFormSheetProps) {
  const translate = useTranslations('credits')
  const ledgerId = useLedgerStore((ledger) => ledger.ledgerId)
  const baseCurrency = useLedgerStore((ledger) => ledger.baseCurrency)
  const today = useToday()
  const accounts = (useCredits().data?.accounts ?? []).filter((account) => !account.archived)
  const save = useSaveCredit()
  // made once per open sheet: a retry after a lost answer replays the same create instead of adding a second credit
  const [id] = useState(() => crypto.randomUUID())
  const form = useForm<FormInput, unknown, CreditFormValues>({
    resolver: useZodResolver(creditFormSchema),
    defaultValues: defaultsOf(credit, today, baseCurrency),
  })
  const mode = form.watch('mode')
  const ModeFields = MODE_FIELDS[mode]

  const onSubmit = form.handleSubmit((values) =>
    save.mutate(
      toSaveCreditInput(values, {
        id: credit?.id ?? id,
        ledgerId,
        version: credit?.version ?? null,
      }),
      {
        onSuccess: () => {
          notify.success(translate('form.saved'))
          onCloseAction()
        },
      },
    ),
  )

  return (
    <Sheet
      open
      onOpenChange={(open) => !open && onCloseAction()}
      title={translate(credit ? 'form.editTitle' : 'form.createTitle')}
      footer={
        <>
          <Button variant="secondary" type="button" onClick={onCloseAction}>
            {translate('form.cancel')}
          </Button>
          <Button type="submit" form={FORM_ID} disabled={save.isPending}>
            {translate('form.save')}
          </Button>
        </>
      }
    >
      <FormProvider {...form}>
        <form id={FORM_ID} onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
          {!credit && (
            <SegmentedControl
              label={translate('form.mode')}
              options={CREDIT_MODES.map((value) => ({
                value,
                label: translate(`form.modes.${value}`),
              }))}
              value={mode === 'edit' ? undefined : mode}
              onValueChange={(next) => form.setValue('mode', next)}
            />
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="name"
              label={translate('form.name')}
              required
              render={(field) => <Input {...field} autoFocus />}
            />
            <FormField
              control={form.control}
              name="lender"
              label={translate('form.lender')}
              render={(field) => <Input {...field} />}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {!credit && (
              <FormField
                control={form.control}
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
            <FormField
              control={form.control}
              name="accountId"
              label={translate('form.account')}
              render={(field) => (
                <Select
                  options={[
                    {
                      value: '',
                      label: translate('form.none'),
                    },
                    ...accounts.map((account) => ({
                      value: account.id,
                      label: `${account.name} · ${account.currency}`,
                    })),
                  ]}
                  value={field.value ?? ''}
                  onValueChange={(next) => field.onChange(next || null)}
                  onBlur={field.onBlur}
                />
              )}
            />
          </div>
          <MoneyField name="price" label={translate('form.price')} hint={translate('form.priceHint')} />
          <ModeFields />
        </form>
      </FormProvider>
    </Sheet>
  )
}
