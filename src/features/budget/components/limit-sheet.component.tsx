import { useLocale, useTranslations } from 'next-intl'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button.component'
import { Sheet } from '@/components/ui/sheet.component'
import { notify } from '@/components/ui/toaster.component'
import { useLedger } from '@/contexts/ledger.context'
import { useZodResolver } from '@/lib/forms/zod-resolver.hook'
import { formatMinor } from '@/lib/money/money.utils'
import { useBudgetSheetStore } from '@/store/budget-sheet.store'
import { useBudgetCategories, useCurrentBudget, useSaveLimit } from '../hooks/budget.hook'
import { useMonthLabel } from '../hooks/month-label.hook'
import { type LimitFormInput, type LimitFormValues, limitFormSchema } from '../schemas/budget-form.schema'
import { LimitSheetFields } from './limit-sheet-fields.component'

const FORM_ID = 'budget-limit-form'

// Figma frame 2:27047 (desktop) / 2:27561: the limit, what is spent, the unspent remainder.
// "valid from" of the frame is not built: a limit belongs to its month, a new month is made by copying.
export function LimitSheet({ categoryId }: { categoryId: string | null }) {
  const translate = useTranslations('budget.limitSheet')
  const locale = useLocale()
  const monthLabel = useMonthLabel()
  const { ledgerId, baseCurrency } = useLedger()
  const close = useBudgetSheetStore((state) => state.close)
  const open = useBudgetSheetStore((state) => state.open)
  const { month, data } = useCurrentBudget()
  const { data: categories = [] } = useBudgetCategories()
  const save = useSaveLimit()
  const [ids] = useState(() => ({
    monthId: crypto.randomUUID(),
    limitId: crypto.randomUUID(),
  }))
  const existing = data?.facts.find((fact) => fact.kind === 'expense' && fact.categoryId === categoryId && fact.limitId)
  const form = useForm<LimitFormInput, unknown, LimitFormValues>({
    resolver: useZodResolver(limitFormSchema),
    defaultValues: {
      categoryId,
      limitMinor: existing?.limitMinor ?? null,
      carryMode: existing?.carryMode ?? 'reset',
    },
  })
  const limited = new Set(data?.facts.filter((fact) => fact.limitId).map((fact) => fact.categoryId))
  const name = categories.find((category) => category.id === categoryId)?.name
  const monthName = monthLabel(month, false)

  const submit = (values: LimitFormValues) =>
    save.mutate(
      {
        ledgerId,
        month,
        monthId: data?.monthId ?? ids.monthId,
        limitId: existing?.limitId ?? ids.limitId,
        categoryId: values.categoryId,
        limitMinor: values.limitMinor,
        carryMode: values.carryMode,
        expectedVersion: existing?.limitVersion ?? null,
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
      title={
        name
          ? translate('title', {
              name,
              month: monthName,
            })
          : translate('titleNew', { month: monthName })
      }
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
        {existing ? (
          <p className="text-label text-text-secondary">
            {translate('spent', { amount: formatMinor(existing.factMinor, baseCurrency, locale) })}
          </p>
        ) : null}
        <LimitSheetFields
          control={form.control}
          choices={categoryId ? null : categories.filter((category) => !limited.has(category.id))}
          carryMode={form.watch('carryMode')}
        />
        {existing && categoryId ? (
          <Button
            type="button"
            variant="danger"
            onClick={() =>
              open({
                kind: 'delete',
                categoryId,
              })
            }
          >
            {translate('delete')}
          </Button>
        ) : null}
      </form>
    </Sheet>
  )
}
