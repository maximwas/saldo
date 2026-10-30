'use client'

import { useTranslations } from 'next-intl'
import { useState } from 'react'
import { Button } from '@/components/ui/button.component'
import { Field } from '@/components/ui/field.component'
import { Input } from '@/components/ui/input.component'
import { Select, type SelectOption } from '@/components/ui/select.component'
import { Sheet } from '@/components/ui/sheet.component'
import { notify } from '@/components/ui/toaster.component'
import { CURRENCIES } from '@/constants/currencies.constants'
import { useCanWrite, useLedger } from '@/contexts/ledger.context'
import { fromMinor, toMinor } from '@/lib/money/money.utils'
import { useCalendarOptions, useSaveCalendarFilter } from '../hooks/calendar.hook'
import { useCalendarParams } from '../hooks/calendar-params.hook'
import type { UrlFilter } from '../utils/calendar-filters.utils'

type CalendarFilterSheetProps = {
  open: boolean
  onOpenChangeAction: (open: boolean) => void
}

const KINDS = ['expense', 'income', 'refund', 'transfer_out', 'debt_in', 'debt_out', 'adjustment'] as const
const STATES = ['fact', 'plan', 'partial', 'unconfirmed', 'paid', 'cancelled'] as const
const SOURCES = ['subscription', 'credit', 'debt', 'manual', 'big_expense', 'auto_plan', 'tax', 'income_plan'] as const
const ANY = 'any'
const SCALAR_KEYS: readonly (keyof UrlFilter)[] = ['entry', 'direction', 'source_id']

type PickKey = 'entry' | 'kinds' | 'states' | 'source_types' | 'category_ids' | 'account_ids' | 'currencies'
type AmountKey = 'min_amount_minor' | 'max_amount_minor'

type PickFieldProps = {
  name: PickKey
  options: readonly SelectOption[]
}

function PickField({ name, options }: PickFieldProps) {
  const translate = useTranslations('calendar')
  const { filterUrl, setUrl } = useCalendarParams()
  const current = filterUrl[name]
  const value = (Array.isArray(current) ? current[0] : current) ?? ANY
  const choose = (next: string | null) => {
    const picked = next === null || next === ANY ? null : next

    void setUrl({ [name]: picked === null || SCALAR_KEYS.includes(name) ? picked : [picked] } as Partial<UrlFilter>)
  }

  return (
    <Field label={translate(`filters.${name}`)}>
      <Select
        options={[
          {
            value: ANY,
            label: translate('filters.any'),
          },
          ...options,
        ]}
        value={value}
        onValueChange={choose}
      />
    </Field>
  )
}

/** a sum in the base currency, written to the URL in minor units when the field is left */
function AmountField({ name }: { name: AmountKey }) {
  const translate = useTranslations('calendar')
  const { baseCurrency } = useLedger()
  const { filterUrl, setUrl } = useCalendarParams()
  const minor = filterUrl[name]

  return (
    <Field label={translate(`filters.${name}`)} hint={translate('filters.amountHint')}>
      <Input
        key={String(minor)}
        inputMode="decimal"
        defaultValue={minor === null ? '' : fromMinor(minor, baseCurrency)}
        onBlur={(event) =>
          void setUrl({ [name]: toMinor(event.currentTarget.value, baseCurrency) } as Partial<UrlFilter>)
        }
      />
    </Field>
  )
}

function SearchField() {
  const translate = useTranslations('calendar')
  const { filterUrl, setUrl } = useCalendarParams()

  return (
    <Field label={translate('filters.q')} hint={translate('filters.qHint')}>
      <Input
        key={filterUrl.q ?? ''}
        type="search"
        defaultValue={filterUrl.q ?? ''}
        onBlur={(event) => void setUrl({ q: event.currentTarget.value.trim() || null })}
        onKeyDown={(event) => event.key === 'Enter' && event.currentTarget.blur()}
      />
    </Field>
  )
}

/** the URL filter as a named set of the space (calendar_saved_filters), for editors and owners */
function SaveSet() {
  const translate = useTranslations('calendar')
  const { ledgerId } = useLedger()
  const { filter } = useCalendarParams()
  const save = useSaveCalendarFilter()
  const [name, setName] = useState('')

  return (
    <div className="flex flex-col gap-3 border-t border-border pt-4">
      <Field label={translate('filters.saveName')}>
        <Input value={name} maxLength={80} onChange={(event) => setName(event.currentTarget.value)} />
      </Field>
      <Button
        variant="secondary"
        disabled={name.trim() === '' || Object.keys(filter).length === 0 || save.isPending}
        onClick={() =>
          save.mutate(
            {
              id: crypto.randomUUID(),
              ledgerId,
              name,
              filter,
            },
            {
              onSuccess: () => {
                notify.success(translate('filters.saved'))
                setName('')
              },
            },
          )
        }
      >
        {translate('filters.save')}
      </Button>
    </div>
  )
}

// No Figma frame for the filters themselves: a sheet of fields over the same URL keys the chips use (§18: type,
// fact/plan, state, source, category, account, currency, amount, search), each applied at once
export function CalendarFilterSheet({ open, onOpenChangeAction }: CalendarFilterSheetProps) {
  const translate = useTranslations('calendar')
  const canWrite = useCanWrite()
  const options = useCalendarOptions().data
  const labelled = <Key extends string>(values: readonly Key[], label: (value: Key) => string) =>
    values.map((value) => ({
      value,
      label: label(value),
    }))

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChangeAction}
      title={translate('filters.open')}
      footer={<Button onClick={() => onOpenChangeAction(false)}>{translate('filters.done')}</Button>}
    >
      <div className="flex flex-col gap-4">
        <SearchField />
        <PickField
          name="entry"
          options={labelled(['fact', 'plan'] as const, (value) => translate(`entryType.${value}`))}
        />
        <PickField name="kinds" options={labelled(KINDS, (value) => translate(`kind.${value}`))} />
        <PickField name="states" options={labelled(STATES, (value) => translate(`state.${value}`))} />
        <PickField name="source_types" options={labelled(SOURCES, (value) => translate(`source.${value}`))} />
        <PickField
          name="category_ids"
          options={(options?.categories ?? []).map((row) => ({
            value: row.id,
            label: row.name,
          }))}
        />
        <PickField
          name="account_ids"
          options={(options?.accounts ?? []).map((row) => ({
            value: row.id,
            label: row.name,
          }))}
        />
        <PickField name="currencies" options={labelled(CURRENCIES, (value) => value)} />
        <div className="grid gap-4 sm:grid-cols-2">
          <AmountField name="min_amount_minor" />
          <AmountField name="max_amount_minor" />
        </div>
        {canWrite && <SaveSet />}
      </div>
    </Sheet>
  )
}
