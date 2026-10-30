import { useTranslations } from 'next-intl'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button.component'
import { FormField } from '@/components/ui/form-field.component'
import { MoneyInput } from '@/components/ui/money-input.component'
import { Sheet } from '@/components/ui/sheet.component'
import { notify } from '@/components/ui/toaster.component'
import { useLedger } from '@/contexts/ledger.context'
import { useZodResolver } from '@/lib/forms/zod-resolver.hook'
import { useBudgetSheetStore } from '@/store/budget-sheet.store'
import { useCurrentBudget, useSetIncomePlan } from '../hooks/budget.hook'
import { useMonthLabel } from '../hooks/month-label.hook'
import { type IncomeFormInput, type IncomeFormValues, incomeFormSchema } from '../schemas/budget-form.schema'

const FORM_ID = 'budget-income-form'

// the expected income of the month; never summed into the fact (§12). Empty = no plan.
export function IncomePlanSheet() {
  const translate = useTranslations('budget.incomeSheet')
  const monthLabel = useMonthLabel()
  const { ledgerId, baseCurrency } = useLedger()
  const close = useBudgetSheetStore((state) => state.close)
  const { month, data } = useCurrentBudget()
  const save = useSetIncomePlan()
  const [monthId] = useState(() => crypto.randomUUID())
  const form = useForm<IncomeFormInput, unknown, IncomeFormValues>({
    resolver: useZodResolver(incomeFormSchema),
    defaultValues: { incomePlanMinor: data?.incomePlanMinor ?? null },
  })

  const submit = (values: IncomeFormValues) =>
    save.mutate(
      {
        ledgerId,
        month,
        monthId: data?.monthId ?? monthId,
        incomePlanMinor: values.incomePlanMinor,
        expectedVersion: data?.monthVersion ?? null,
      },
      {
        onSuccess: () => {
          notify.success(translate('saved'))
          close()
        },
      },
    )

  return (
    <Sheet
      open
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          close()
        }
      }}
      title={translate('title', { month: monthLabel(month, false) })}
      footer={
        <>
          <Button type="button" variant="secondary" onClick={close}>
            {translate('cancel')}
          </Button>
          <Button type="submit" form={FORM_ID} disabled={save.isPending}>
            {translate('save')}
          </Button>
        </>
      }
    >
      <form id={FORM_ID} noValidate onSubmit={form.handleSubmit(submit)} className="flex flex-col gap-4">
        <p className="text-label text-text-secondary">{translate('hint')}</p>
        <FormField
          control={form.control}
          name="incomePlanMinor"
          label={translate('amount')}
          render={(field) => (
            <MoneyInput
              ref={field.ref}
              name={field.name}
              value={field.value}
              onValueChange={field.onChange}
              onBlur={field.onBlur}
              currency={baseCurrency}
              placeholder="0,00"
              autoFocus
            />
          )}
        />
      </form>
    </Sheet>
  )
}
