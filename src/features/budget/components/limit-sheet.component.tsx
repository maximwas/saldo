import { useLocale, useTranslations } from 'next-intl'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button.component'
import { CategoryBadge } from '@/components/ui/category-badge.component'
import { Sheet, SheetClose } from '@/components/ui/sheet.component'
import { notify } from '@/components/ui/toaster.component'
import { useLedger } from '@/contexts/ledger.context'
import { useZodResolver } from '@/lib/forms/zod-resolver.hook'
import { formatMinor } from '@/lib/money/money.utils'
import { useBudgetSheetStore } from '@/store/budget-sheet.store'
import { useBudgetCategories, useCurrentBudget, useSaveLimit } from '../hooks/budget.hook'
import { useMonthLabel } from '../hooks/month-label.hook'
import { type LimitFormInput, type LimitFormValues, limitFormSchema } from '../schemas/budget-form.schema'
import { type BudgetFact, limitProgress, shiftMonth } from '../utils/budget.utils'
import { LimitSheetFields } from './limit-sheet-fields.component'

const FORM_ID = 'budget-limit-form'

type LimitWrite = {
  limitId: string
  categoryId: string
  limitMinor: number
  carryMode: BudgetFact['carryMode']
  expectedVersion: number | null
}

// Figma frames: new limit 42:112999 (desktop) / 42:113536 (mobile), edit 42:114031 / 42:114556 (what is spent on top, no
// category field, the carry option, then «Delete limit»). No «valid from»: a limit belongs to its month.
// A category over its limit opens the variant of 42:115110 / 2:30316: a new limit, optionally moved from another
// category's remainder.
export function LimitSheet({ categoryId }: { categoryId: string | null }) {
  const translate = useTranslations('budget.limitSheet')
  const locale = useLocale()
  const monthLabel = useMonthLabel()
  const { ledgerId, baseCurrency } = useLedger()
  const close = useBudgetSheetStore((state) => state.close)
  const open = useBudgetSheetStore((state) => state.open)
  const { month, data } = useCurrentBudget()
  const { data: categories = [] } = useBudgetCategories()
  const translateErrors = useTranslations('errors')
  // two mutations: a move writes two limits, and one mutation runs its per-call callbacks only for the latest call
  const save = useSaveLimit()
  const saveSource = useSaveLimit()
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
      sourceId: null,
    },
  })
  const limited = new Set(data?.facts.filter((fact) => fact.limitId).map((fact) => fact.categoryId))
  const name = categories.find((category) => category.id === categoryId)?.name
  const monthName = monthLabel(month, false)
  const money = (minor: number) => formatMinor(minor, baseCurrency, locale)
  const nameOf = (id: string | null) => categories.find((category) => category.id === id)?.name ?? ''
  const progress = existing ? limitProgress(existing) : null
  const over = existing && progress?.state === 'over' ? progress : null
  // a move takes the free remainder of another limited category
  const sources = over
    ? (data?.facts ?? []).filter(
        (fact) =>
          fact.kind === 'expense' &&
          fact.limitId !== null &&
          fact.categoryId !== categoryId &&
          (fact.remainingMinor ?? 0) > 0,
      )
    : []
  const source = sources.find((fact) => fact.categoryId === form.watch('sourceId'))
  const moveMinor = (form.watch('limitMinor') ?? 0) - (existing?.limitMinor ?? 0)

  let title = translate('titleNew', { month: monthName })

  if (over && name) {
    title = translate('overTitle', {
      name,
      amount: money(over.overMinor),
    })
  } else if (name) {
    title = translate('title', {
      name,
      month: monthName,
    })
  }

  const write = (mutation: typeof save, row: LimitWrite, onSuccess?: () => void) =>
    mutation.mutate(
      {
        ledgerId,
        month,
        monthId: data?.monthId ?? ids.monthId,
        ...row,
      },
      {
        onSuccess,
        onError: () =>
          notify.error(translate('saveFailed', { name: nameOf(row.categoryId) }), {
            onRetry: () => write(mutation, row, onSuccess),
          }),
      },
    )

  const submit = (values: LimitFormValues) => {
    const from = sources.find((fact) => fact.categoryId === values.sourceId)
    const moved = values.limitMinor - (existing?.limitMinor ?? 0)

    if (from && moved > (from.remainingMinor ?? 0)) {
      form.setError('sourceId', {
        message: translateErrors('limitMoveTooBig', { amount: money(from.remainingMinor ?? 0) }),
      })

      return
    }

    write(
      save,
      {
        limitId: existing?.limitId ?? ids.limitId,
        categoryId: values.categoryId,
        limitMinor: values.limitMinor,
        carryMode: values.carryMode,
        expectedVersion: existing?.limitVersion ?? null,
      },
      () => {
        notify.success(translate('saved'))
        close()
      },
    )

    // shortcut: the raise and the cut are two writes, not one RPC; a failed cut keeps its own retry toast
    if (from?.limitId && from.categoryId && from.limitMinor !== null && moved > 0) {
      write(saveSource, {
        limitId: from.limitId,
        categoryId: from.categoryId,
        limitMinor: from.limitMinor - moved,
        carryMode: from.carryMode,
        expectedVersion: from.limitVersion,
      })
    }
  }

  return (
    <Sheet
      open
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          close()
        }
      }}
      title={title}
      footer={
        <>
          <SheetClose>{translate(over ? 'keep' : 'cancel')}</SheetClose>
          <Button type="submit" form={FORM_ID} disabled={save.isPending}>
            {translate(over ? 'saveOver' : 'save')}
          </Button>
        </>
      }
    >
      <form id={FORM_ID} noValidate onSubmit={form.handleSubmit(submit)} className="flex flex-col gap-4">
        {existing ? (
          <p className="text-label text-text-secondary">
            {over
              ? translate('overText', {
                  spent: money(existing.factMinor),
                  limit: money((existing.limitMinor ?? 0) + (existing.carriedInMinor ?? 0)),
                  pct: over.percent,
                })
              : translate('spent', { amount: money(existing.factMinor) })}
          </p>
        ) : null}
        <LimitSheetFields
          control={form.control}
          choices={categoryId ? null : categories.filter((category) => !limited.has(category.id))}
          carryMode={form.watch('carryMode')}
          nextMonth={monthLabel(shiftMonth(month, 1), false)}
          move={
            over
              ? {
                  options: sources.map((fact) => {
                    const category = categories.find((item) => item.id === fact.categoryId)

                    return {
                      value: fact.categoryId ?? '',
                      label: translate('moveOption', {
                        name: category?.name ?? '',
                        amount: money(fact.remainingMinor ?? 0),
                      }),
                      leading: (
                        <CategoryBadge icon={category?.icon ?? null} color={category?.color ?? null} size={32} />
                      ),
                    }
                  }),
                  hint:
                    source && moveMinor > 0
                      ? translate('moveHint', {
                          name: nameOf(source.categoryId),
                          amount: money(moveMinor),
                        })
                      : undefined,
                }
              : null
          }
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
