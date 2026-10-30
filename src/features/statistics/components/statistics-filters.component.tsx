'use client'

import { useFormatter, useLocale, useTranslations } from 'next-intl'
import { SegmentedControl } from '@/components/ui/segmented-control.component'
import { Select, type SelectOption } from '@/components/ui/select.component'
import { useMemberNames } from '@/lib/members/member-names.hook'
import { cn } from '@/lib/utils/cn.utils'
import { useStatisticsFilters } from '../hooks/statistics-filters.hook'
import { BUCKETS, isRolling, periodOptions, VIEWS } from '../utils/statistics-period.utils'

const ALL = 'all'
const CHIP = 'h-9 w-auto min-w-0 gap-1.5 rounded-full px-3 text-label font-medium'
const CHIP_ON = 'border-primary-soft bg-primary-soft text-primary-text'

// a chip has no visible label, so a screen-reader label is attached to the Select
function Chip({
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

function usePeriodLabel() {
  const translate = useTranslations('statistics')
  const formatter = useFormatter()
  const locale = useLocale()

  return (period: string): string => {
    if (isRolling(period)) {
      return translate(`periods.${period as '3m' | '6m' | '12m'}`)
    }

    if (period.length === 4) {
      return period
    }

    const label = formatter.dateTime(new Date(`${period}-15T12:00:00Z`), {
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    })

    return label.charAt(0).toLocaleUpperCase(locale) + label.slice(1)
  }
}

// Figma «Saldo» → Statistics 2:73594: chips on the left (period, the rest of the filters), Chart / Table on the right.
// Account, category, currency and type chips of the frame are not here: the stats functions take the period and «Who».
export function StatisticsFilters() {
  const translate = useTranslations('statistics')
  const { today, period, params, who, view, setUrl } = useStatisticsFilters()
  const members = useMemberNames()
  const label = usePeriodLabel()
  const periods = periodOptions(today)
  const options: SelectOption[] = (periods.includes(period) ? periods : [period, ...periods]).map((value) => ({
    value,
    label: label(value),
  }))

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Chip
          id="statistics-period"
          label={translate('filters.period')}
          className={cn(CHIP, CHIP_ON)}
          options={options}
          value={period}
          // the current month is the default and stays out of the URL
          onValueChange={(value) =>
            setUrl({
              period: value === today.slice(0, 7) ? null : value,
              bucket: null,
            })
          }
        />
        <Chip
          id="statistics-bucket"
          label={translate('filters.bucket')}
          className={CHIP}
          options={BUCKETS.map((value) => ({
            value,
            label: translate(`buckets.${value}`),
          }))}
          value={params.bucket}
          onValueChange={(value) => setUrl({ bucket: value as (typeof BUCKETS)[number] })}
        />
        {Object.keys(members).length > 1 && (
          <Chip
            id="statistics-who"
            label={translate('filters.who')}
            className={cn(CHIP, who && CHIP_ON)}
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
            value={who ?? ALL}
            onValueChange={(value) => setUrl({ who: value === ALL ? null : value })}
          />
        )}
      </div>
      <SegmentedControl
        label={translate('filters.view')}
        options={VIEWS.map((value) => ({
          value,
          label: translate(`views.${value}`),
        }))}
        value={view}
        onValueChange={(next) => setUrl({ view: next })}
      />
    </div>
  )
}
