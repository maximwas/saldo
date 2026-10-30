import { useTranslations } from 'next-intl'
import type { Control } from 'react-hook-form'
import { FormField } from '@/components/ui/form-field.component'
import { MoneyInput } from '@/components/ui/money-input.component'
import { Select } from '@/components/ui/select.component'
import { useLedgerStore } from '@/contexts/ledger.context'
import type { BudgetCategory } from '../api/budget.api'
import type { LimitFormInput } from '../schemas/budget-form.schema'
import { CARRY_MODES, type CarryMode } from '../utils/budget.utils'

type LimitSheetFieldsProps = {
  control: Control<LimitFormInput>
  /** categories a new limit can still take; null = the category is fixed (editing) */
  choices: readonly BudgetCategory[] | null
  carryMode: CarryMode
}

export function LimitSheetFields({ control, choices, carryMode }: LimitSheetFieldsProps) {
  const translate = useTranslations('budget.limitSheet')
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
        label={translate('amount')}
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
      <FormField
        control={control}
        name="carryMode"
        label={translate('carry')}
        hint={translate(carryMode === 'carry' ? 'carryHintCarry' : 'carryHintReset')}
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
    </>
  )
}
