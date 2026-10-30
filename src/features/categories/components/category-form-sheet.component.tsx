'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslations } from 'next-intl'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button.component'
import { ICON_NAMES } from '@/components/ui/category-icon.component'
import { FormField } from '@/components/ui/form-field.component'
import { Input } from '@/components/ui/input.component'
import { Select } from '@/components/ui/select.component'
import { Sheet } from '@/components/ui/sheet.component'
import { notify } from '@/components/ui/toaster.component'
import { CATEGORY_COLORS } from '@/constants/category-colors.constants'
import { useLedger } from '@/contexts/ledger.context'
import { useCreateCategory, useUpdateCategory } from '../hooks/categories.hook'
import {
  type CategoryFormValues,
  categoryFormSchema,
  toCreateCategoryInput,
  toUpdateCategoryInput,
} from '../schemas/category-form.schema'
import { CATEGORY_KINDS, type CategoryKind, type CategoryView, nextCategorySortOrder } from '../utils/categories.utils'

const FORM_ID = 'category-form'

// a sentinel for «no value» in a Select: its value is a string, the form keeps null
const NONE = 'none'

export type CategoryFormTarget = {
  /** the category being edited; null = a new one */
  category: CategoryView | null
  kind: CategoryKind
  /** the parent a new subcategory starts with */
  parentId: string | null
}

type CategoryFormSheetProps = {
  /** null = the sheet is closed */
  target: CategoryFormTarget | null
  categories: readonly CategoryView[]
  onCloseAction: () => void
}

// no Figma frame for the category form: it is the accounts edit Dialog ( · 5:106946) with the
// fields of §6 — name, kind and parent on create, colour and icon always
export function CategoryFormSheet({ target, categories, onCloseAction }: CategoryFormSheetProps) {
  const translate = useTranslations('categories')
  const { ledgerId } = useLedger()
  const create = useCreateCategory()
  const update = useUpdateCategory()
  const pending = create.isPending || update.isPending
  const editing = target?.category ?? null

  const done = () => {
    notify.success(translate('form.saved'))
    onCloseAction()
  }

  const submit = (values: CategoryFormValues, newId: string) => {
    if (editing) {
      update.mutate(
        toUpdateCategoryInput(values, {
          id: editing.id,
          expectedVersion: editing.version,
        }),
        {
          onSuccess: done,
        },
      )

      return
    }

    const siblings = categories.filter(
      (row) => row.archivedAt === null && row.kind === values.kind && row.parentId === values.parentId,
    )

    create.mutate(
      toCreateCategoryInput(values, {
        id: newId,
        ledgerId,
        sortOrder: nextCategorySortOrder(siblings),
      }),
      {
        onSuccess: done,
      },
    )
  }

  return (
    <Sheet
      open={target !== null}
      onOpenChange={(open) => {
        if (!open) {
          onCloseAction()
        }
      }}
      title={translate(editing ? 'form.editTitle' : 'form.createTitle')}
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onCloseAction}>
            {translate('form.cancel')}
          </Button>
          <Button type="submit" form={FORM_ID} disabled={pending}>
            {translate('form.save')}
          </Button>
        </>
      }
    >
      {target ? <CategoryForm target={target} categories={categories} onSubmitAction={submit} /> : null}
    </Sheet>
  )
}

type CategoryFormProps = {
  target: CategoryFormTarget
  categories: readonly CategoryView[]
  onSubmitAction: (values: CategoryFormValues, newId: string) => void
}

function CategoryForm({ target, categories, onSubmitAction }: CategoryFormProps) {
  const translate = useTranslations('categories')
  const { category } = target
  // one id per opened form: a double click on «Save» sends the same id, so it is one category
  const [newId] = useState(() => crypto.randomUUID())
  const parent = categories.find((row) => row.id === target.parentId)
  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: {
      name: category?.name ?? '',
      kind: category?.kind ?? target.kind,
      parentId: category?.parentId ?? target.parentId,
      color: (category?.color ?? parent?.color ?? null) as CategoryFormValues['color'],
      icon: category?.icon ?? parent?.icon ?? 'tag',
    },
  })
  const kind = form.watch('kind')
  const parentOptions = categories.filter(
    (row) => row.archivedAt === null && row.parentId === null && row.kind === kind,
  )

  return (
    <form
      id={FORM_ID}
      noValidate
      onSubmit={form.handleSubmit((values) => onSubmitAction(values, newId))}
      className="flex flex-col gap-4"
    >
      <FormField
        control={form.control}
        name="name"
        label={translate('form.name')}
        render={(field) => <Input {...field} autoComplete="off" />}
      />
      {category ? null : (
        <>
          <FormField
            control={form.control}
            name="kind"
            label={translate('form.kind')}
            render={(field) => (
              <Select
                name={field.name}
                value={field.value}
                onBlur={field.onBlur}
                onValueChange={(value) => {
                  field.onChange(value)
                  form.setValue('parentId', null)
                }}
                options={CATEGORY_KINDS.map((option) => ({
                  value: option,
                  label: translate(`kind.${option}`),
                }))}
              />
            )}
          />
          <FormField
            control={form.control}
            name="parentId"
            label={translate('form.parent')}
            render={(field) => (
              <Select
                name={field.name}
                value={field.value ?? NONE}
                onBlur={field.onBlur}
                onValueChange={(value) => field.onChange(value === NONE ? null : value)}
                options={[
                  {
                    value: NONE,
                    label: translate('form.noParent'),
                  },
                  ...parentOptions.map((row) => ({
                    value: row.id,
                    label: row.name,
                  })),
                ]}
              />
            )}
          />
        </>
      )}
      <FormField
        control={form.control}
        name="color"
        label={translate('form.color')}
        render={(field) => (
          <Select
            name={field.name}
            value={field.value ?? NONE}
            onBlur={field.onBlur}
            onValueChange={(value) => field.onChange(value === NONE ? null : value)}
            options={[
              {
                value: NONE,
                label: translate('colors.neutral'),
              },
              ...CATEGORY_COLORS.map((color) => ({
                value: color,
                label: translate(`colors.${color}`),
              })),
            ]}
          />
        )}
      />
      <FormField
        control={form.control}
        name="icon"
        label={translate('form.icon')}
        render={(field) => (
          <Select
            name={field.name}
            value={field.value}
            onBlur={field.onBlur}
            onValueChange={field.onChange}
            options={ICON_NAMES.map((icon) => ({
              value: icon,
              label: translate(`icons.${icon}`),
            }))}
          />
        )}
      />
    </form>
  )
}
