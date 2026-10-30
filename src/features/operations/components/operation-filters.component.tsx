'use client'

import { useFormatter, useTranslations } from 'next-intl'
import { SegmentedControl } from '@/components/ui/segmented-control.component'
import { Select } from '@/components/ui/select.component'
import { cn } from '@/lib/utils/cn.utils'
import type { AccountOption, CategoryOption, OperationType } from '../operations.types'
import { OPERATION_TYPES } from '../operations.types'
import { ALL_TIME, recentMonths } from '../utils/operation-filters.utils'

const ALL = 'all'
const CHIP = 'h-9 w-auto min-w-0 gap-1.5 rounded-full px-3 text-label font-medium'
const CHIP_ON = 'border-primary-soft bg-primary-soft text-primary-text'

// a chip has no visible label, so a screen-reader label is attached to the Select
function ChipSelect({
  label,
  ...props
}: React.ComponentProps<typeof Select> & {
  id: string
  label: string
}) {
  return (
    <>
      <label htmlFor={props.id} className="sr-only">
        {label}
      </label>
      <Select {...props} />
    </>
  )
}

type OperationFiltersProps = {
  today: string
  period: string
  accountId: string | null
  categoryId: string | null
  type: OperationType
  accounts: AccountOption[]
  categories: CategoryOption[]
  onChangeAction: (change: {
    period?: string | null
    account?: string | null
    category?: string | null
    type?: OperationType
  }) => void
}

// Figma Saldo file → Operations 2:11403 "Filters": the type switch, then chips (period, account, category); the selected
// period is a primary-soft chip with a check. Currency, amount, link and text chips wait for their phases.
export function OperationFilters({
  today,
  period,
  accountId,
  categoryId,
  type,
  accounts,
  categories,
  onChangeAction,
}: OperationFiltersProps) {
  const translate = useTranslations('operations')
  const formatter = useFormatter()
  const monthLabel = (month: string) =>
    formatter.dateTime(new Date(`${month}-15T12:00:00Z`), {
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    })
  const months = recentMonths(today, 12)

  return (
    <div className="flex flex-col gap-4">
      <SegmentedControl
        label={translate('typeLabel')}
        options={OPERATION_TYPES.map((value) => ({
          value,
          label: translate(`types.${value}`),
        }))}
        value={type}
        onValueChange={(next) => onChangeAction({ type: next })}
      />
      <div className="flex flex-wrap items-center gap-2">
        <ChipSelect
          className={cn(CHIP, CHIP_ON, 'capitalize')}
          options={[
            {
              value: ALL_TIME,
              label: translate('filters.allTime'),
            },
            // an older month picked from a link stays in the list
            ...(months.includes(period) || period === ALL_TIME
              ? []
              : [
                  {
                    value: period,
                    label: monthLabel(period),
                  },
                ]),
            ...months.map((month) => ({
              value: month,
              label: monthLabel(month),
            })),
          ]}
          value={period}
          // the current month is the default and stays out of the URL
          onValueChange={(value) => onChangeAction({ period: value === months[0] ? null : value })}
          id="operation-filter-period"
          label={translate('filters.period')}
        />
        <ChipSelect
          className={cn(CHIP, accountId && CHIP_ON)}
          options={[
            {
              value: ALL,
              label: translate('filters.allAccounts'),
            },
            ...accounts.map((account) => ({
              value: account.id,
              label: account.name,
            })),
          ]}
          value={accountId ?? ALL}
          onValueChange={(value) => onChangeAction({ account: value === ALL ? null : value })}
          id="operation-filter-account"
          label={translate('filters.account')}
        />
        <ChipSelect
          className={cn(CHIP, categoryId && CHIP_ON)}
          options={[
            {
              value: ALL,
              label: translate('filters.allCategories'),
            },
            ...categories
              .filter((category) => !category.archived)
              .map((category) => ({
                value: category.id,
                label: category.name,
              })),
          ]}
          value={categoryId ?? ALL}
          onValueChange={(value) => onChangeAction({ category: value === ALL ? null : value })}
          id="operation-filter-category"
          label={translate('filters.category')}
        />
      </div>
    </div>
  )
}
