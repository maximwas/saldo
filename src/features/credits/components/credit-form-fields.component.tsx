'use client'

import { addMonths, format, parseISO } from 'date-fns'
import { Plus, X } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useFieldArray, useFormContext } from 'react-hook-form'
import type { z } from 'zod'
import { Button } from '@/components/ui/button.component'
import { DatePicker } from '@/components/ui/date-picker.component'
import { FormField } from '@/components/ui/form-field.component'
import { Input } from '@/components/ui/input.component'
import { MoneyInput } from '@/components/ui/money-input.component'
import { useToday } from '@/contexts/clock.context'
import { fromMinor, toMinor } from '@/lib/money/money.utils'
import type { CreditFormValues, creditFormSchema } from '../schemas/credit-form.schema'

type FormInput = z.input<typeof creditFormSchema>

const useCreditForm = () => useFormContext<FormInput, unknown, CreditFormValues>()

type MoneyFieldProps = {
  name: 'price' | 'total' | 'remaining' | 'installment' | `rows.${number}.amount`
  label: string
  hint?: string
}

export function MoneyField({ name, label, hint }: MoneyFieldProps) {
  const { control, watch } = useCreditForm()
  const currency = watch('currency')

  return (
    <FormField
      control={control}
      name={name}
      label={label}
      hint={hint}
      render={(field) => (
        <MoneyInput
          value={toMinor(field.value, currency)}
          onValueChange={(minor) => field.onChange(minor === null ? '' : fromMinor(minor, currency))}
          currency={currency}
          onBlur={field.onBlur}
        />
      )}
    />
  )
}

type DateFieldProps = {
  name: 'firstOn' | `rows.${number}.dueOn`
  label: string
}

function DateField({ name, label }: DateFieldProps) {
  const { control } = useCreditForm()

  return (
    <FormField
      control={control}
      name={name}
      label={label}
      render={(field) => (
        <DatePicker
          value={field.value || null}
          onValueChange={(next) => field.onChange(next ?? '')}
          onBlur={field.onBlur}
        />
      )}
    />
  )
}

type CountFieldProps = {
  name: 'count' | 'paidCount'
  label: string
  hint?: string
}

function CountField({ name, label, hint }: CountFieldProps) {
  const { control } = useCreditForm()

  return (
    <FormField
      control={control}
      name={name}
      label={label}
      hint={hint}
      render={(field) => <Input {...field} type="number" inputMode="numeric" min={0} step={1} />}
    />
  )
}

/** equal installments: total ÷ count from the first date, an estimated schedule (§9) */
export function EqualFields() {
  const translate = useTranslations('credits')

  return (
    <>
      <MoneyField name="total" label={translate('form.total')} />
      <div className="grid gap-4 sm:grid-cols-2">
        <CountField name="count" label={translate('form.count')} />
        <DateField name="firstOn" label={translate('form.firstOn')} />
      </div>
      <p className="text-caption text-text-secondary">{translate('form.equalHint')}</p>
    </>
  )
}

/** an existing credit: the rest from the next date, the remaining balance and the installment (§9) */
export function ExistingFields() {
  const translate = useTranslations('credits')

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <MoneyField name="remaining" label={translate('form.remaining')} />
        <MoneyField name="installment" label={translate('form.installment')} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <DateField name="firstOn" label={translate('form.nextOn')} />
        <CountField name="paidCount" label={translate('form.paidCount')} hint={translate('form.paidCountHint')} />
      </div>
    </>
  )
}

/** a month after the last typed date, or today for the first row */
const nextRowDate = (last: string | undefined, today: string) =>
  last ? format(addMonths(parseISO(last), 1), 'yyyy-MM-dd') : today

/** the full schedule typed in from the bank: a confirmed schedule (§9) */
export function ScheduleFields() {
  const translate = useTranslations('credits')
  const today = useToday()
  const { control, getValues, formState } = useCreditForm()
  const rows = useFieldArray({
    control,
    name: 'rows',
  })
  const rowsError = formState.errors.rows?.message ?? formState.errors.rows?.root?.message

  const addRow = () =>
    rows.append({
      dueOn: nextRowDate(getValues('rows').at(-1)?.dueOn, today),
      amount: getValues('rows').at(-1)?.amount ?? '',
    })

  return (
    <div className="flex flex-col gap-3">
      <p className="text-caption text-text-secondary">{translate('form.scheduleHint')}</p>
      {rows.fields.map((row, index) => (
        <div key={row.id} className="grid grid-cols-2 items-start gap-3 sm:gap-4">
          <DateField name={`rows.${index}.dueOn`} label={translate('form.rowDate', { number: index + 1 })} />
          <div className="flex items-start gap-1">
            <div className="min-w-0 flex-1">
              <MoneyField name={`rows.${index}.amount`} label={translate('form.rowAmount', { number: index + 1 })} />
            </div>
            <button
              type="button"
              aria-label={translate('form.removeRow', { number: index + 1 })}
              onClick={() => rows.remove(index)}
              className="mt-7 flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-md text-text-secondary outline-none hover:bg-subtle focus-visible:ring-2 focus-visible:ring-primary"
            >
              <X aria-hidden size={20} />
            </button>
          </div>
        </div>
      ))}
      {rowsError && (
        <p role="alert" className="text-caption text-negative-text">
          {rowsError}
        </p>
      )}
      <Button type="button" variant="secondary" size="s" className="w-fit" onClick={addRow}>
        <Plus aria-hidden size={16} />
        {translate('form.addRow')}
      </Button>
    </div>
  )
}
