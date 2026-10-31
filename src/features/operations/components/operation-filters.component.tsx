'use client'

import { useQuery } from '@tanstack/react-query'
import { useFormatter, useLocale, useTranslations } from 'next-intl'
import { CategoryBadge } from '@/components/ui/category-badge.component'
import { SegmentedControl } from '@/components/ui/segmented-control.component'
import { Select } from '@/components/ui/select.component'
import { useToday } from '@/contexts/clock.context'
import { useLedgerStore } from '@/contexts/ledger.context'
import { useMemberNames } from '@/lib/members/member-names.hook'
import { operationQueries } from '../api/operations.queries'
import type { OperationType } from '../operations.types'
import { OPERATION_TYPES } from '../operations.types'
import { ALL_TIME, recentMonths } from '../utils/operation-filters.utils'

const ALL = 'all'

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
  period: string
  accountId: string | null
  categoryId: string | null
  createdBy: string | null
  type: OperationType
  onChangeAction: (change: {
    period?: string | null
    account?: string | null
    category?: string | null
    who?: string | null
    type?: OperationType
  }) => void
}

// Figma Saldo file → Operations 2:11403 "Filters" (gap 16): the type switch, then Chip 2:7714 selects (gap 8; the period
// is always the selected look with a check); on mobile 2:13681 the chips stay in one line that scrolls to the screen
// edge. Category options carry their CategoryBadge. Currency, amount, link and text chips wait for their phases.
export function OperationFilters({
  period,
  accountId,
  categoryId,
  createdBy,
  type,
  onChangeAction,
}: OperationFiltersProps) {
  const translate = useTranslations('operations')
  const formatter = useFormatter()
  const locale = useLocale()
  const today = useToday()
  const ledgerId = useLedgerStore((ledger) => ledger.ledgerId)
  // the «Who» chip appears when the space has two or more members
  const members = useMemberNames()
  const options = useQuery(operationQueries.options(ledgerId))
  const accounts = options.data?.accounts ?? []
  const categories = options.data?.categories ?? []
  // Figma Chip: the standalone month name, its first letter raised, and the year without the Intl year suffix
  const monthLabel = (month: string) => {
    const label = formatter.dateTime(new Date(`${month}-15T12:00:00Z`), {
      month: 'long',
      timeZone: 'UTC',
    })

    return `${label.charAt(0).toLocaleUpperCase(locale)}${label.slice(1)} ${month.slice(0, 4)}`
  }
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
      <div className="-mr-5 flex items-center gap-2 overflow-x-auto pr-5 scrollbar-none lg:mr-0 lg:flex-wrap lg:overflow-visible lg:pr-0">
        <ChipSelect
          chip="on"
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
          chip={accountId ? 'on' : 'off'}
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
          chip={categoryId ? 'on' : 'off'}
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
                leading: <CategoryBadge icon={category.icon} color={category.color} size={32} />,
              })),
          ]}
          value={categoryId ?? ALL}
          onValueChange={(value) => onChangeAction({ category: value === ALL ? null : value })}
          id="operation-filter-category"
          label={translate('filters.category')}
        />
        {Object.keys(members).length > 1 && (
          <ChipSelect
            chip={createdBy ? 'on' : 'off'}
            options={[
              {
                value: ALL,
                label: translate('filters.allMembers'),
              },
              ...Object.entries(members).map(([userId, name]) => ({
                value: userId,
                label: name,
              })),
            ]}
            value={createdBy ?? ALL}
            onValueChange={(value) => onChangeAction({ who: value === ALL ? null : value })}
            id="operation-filter-who"
            label={translate('filters.who')}
          />
        )}
      </div>
    </div>
  )
}
