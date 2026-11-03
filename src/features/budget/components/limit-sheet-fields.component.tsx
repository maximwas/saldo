import { useLocale, useTranslations } from 'next-intl'
import type { Control } from 'react-hook-form'
import { FormField } from '@/components/ui/form-field.component'
import { MoneyInput } from '@/components/ui/money-input.component'
import { Select, type SelectOption } from '@/components/ui/select.component'
import { useLedgerStore } from '@/contexts/ledger.context'
import { currencySymbol } from '@/lib/money/money.utils'
import type { BudgetCategory } from '../api/budget.api'
import type { LimitFormInput } from '../schemas/budget-form.schema'
import { CARRY_MODES, type CarryMode } from '../utils/budget.utils'

type LimitSheetFieldsProps = {
  control: Control<LimitFormInput>
  /** categories a new limit can still take; null = the category is fixed (editing) */
  choices: readonly BudgetCategory[] | null
  carryMode: CarryMode
  /** the month after the one on screen, for «does not move to …» */
  nextMonth: string
  /** over the limit (Figma 2:30757): «new limit» and «or move from a category» take the place of the carry select */
  move: {
    options: readonly SelectOption[]
    hint: string | undefined
  } | null
}

export function LimitSheetFields({ control, choices, carryMode, nextMonth, move }: LimitSheetFieldsProps) {
  const translate = useTranslations('budget.limitSheet')
  const locale = useLocale()
  const currency = useLedgerStore((ledger) => ledger.baseCurrency)

  return (
    <>
      {choices ? (
        <FormField
          control={control}
          name="categoryId"
          label={translate('category')}
          render={(field) => (
            <Select
              name={field.name}
              value={field.value}
              onValueChange={field.onChange}
              onBlur={field.onBlur}
              placeholder={translate('categoryPlaceholder')}
              options={choices.map((category) => ({
                value: category.id,
                label: category.name,
              }))}
            />
          )}
        />
      ) : null}
      <FormField
        control={control}
        name="limitMinor"
        label={move ? translate('overAmount') : translate('amount', { currency: currencySymbol(currency, locale) })}
        required={!move}
        render={(field) => (
          <MoneyInput
            ref={field.ref}
            name={field.name}
            value={field.value}
            onValueChange={field.onChange}
            onBlur={field.onBlur}
            currency={currency}
            placeholder="0,00"
            autoFocus
          />
        )}
      />
      {move ? (
        <FormField
          control={control}
          name="sourceId"
          label={translate('moveFrom')}
          hint={move.hint}
          render={(field) => (
            <Select
              name={field.name}
              value={field.value ?? ''}
              onValueChange={(value) => field.onChange(value || null)}
              onBlur={field.onBlur}
              options={[
                {
                  value: '',
                  label: translate('moveNone'),
                },
                ...move.options,
              ]}
            />
          )}
        />
      ) : (
        <FormField
          control={control}
          name="carryMode"
          label={translate('carry')}
          required
          hint={carryMode === 'carry' ? translate('carryHintCarry') : translate('carryHintReset', { month: nextMonth })}
          render={(field) => (
            <Select
              name={field.name}
              value={field.value}
              onValueChange={field.onChange}
              onBlur={field.onBlur}
              options={CARRY_MODES.map((mode) => ({
                value: mode,
                label: translate(mode === 'carry' ? 'carryCarry' : 'carryReset'),
              }))}
            />
          )}
        />
      )}
    </>
  )
}
