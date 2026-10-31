'use client'

import { useQuery } from '@tanstack/react-query'
import { useFormatter, useTranslations } from 'next-intl'
import { Amount } from '@/components/ui/amount.component'
import { useLedgerStore } from '@/contexts/ledger.context'
import { statisticsQueries } from '../api/statistics.queries'
import { useStatisticsFilters } from '../hooks/statistics-filters.hook'
import { cardStatus, type ForecastMonth, forecastMonths } from '../utils/statistics.utils'
import { forecastRange } from '../utils/statistics-period.utils'
import { BarsChart } from './bars-chart.component'
import { QueryCard } from './query-card.component'
import { StatTable } from './stat-table.component'

function useMonthName() {
  const format = useFormatter()

  return (month: string) =>
    format.dateTime(new Date(`${month}-15T12:00:00Z`), {
      month: 'long',
      timeZone: 'UTC',
    })
}

function ForecastView({ months }: { months: ForecastMonth[] }) {
  const translate = useTranslations('statistics')
  const currency = useLedgerStore((ledger) => ledger.baseCurrency)
  const { view } = useStatisticsFilters()
  const name = useMonthName()

  if (view === 'chart') {
    return (
      <BarsChart
        currency={currency}
        summary={translate('forecast.summary', { count: months.length })}
        series={[
          {
            key: 'out',
            name: translate('forecast.out'),
            fill: 'var(--color-neutral)',
          },
        ]}
        data={months.map((month) => ({
          label: name(month.month),
          out: month.outMinor,
        }))}
      />
    )
  }

  return (
    <StatTable
      caption={translate('forecast.title')}
      headers={[
        { label: translate('cashflow.period') },
        {
          label: translate('forecast.out'),
          end: true,
        },
        {
          label: translate('forecast.in'),
          end: true,
        },
      ]}
      rows={months.map((month) => ({
        key: month.month,
        cells: [
          name(month.month),
          <Amount key="o" minor={month.outMinor} currency={currency} kind="plan" />,
          <Amount key="i" minor={month.inMinor} currency={currency} kind="plan" />,
        ],
      }))}
    />
  )
}

// Figma «Saldo» → Statistics 2:73594 "November, entered schedules only": the months ahead hold only what the entered
// schedules say (obligations from the calendar plans); no expected income or average is guessed (§20).
export function ForecastCard() {
  const translate = useTranslations('statistics')
  const { today, params } = useStatisticsFilters()
  const range = forecastRange(today)
  const query = useQuery(
    statisticsQueries.forecast({
      ...params,
      from: range.from,
      to: range.to,
      bucket: 'month',
      createdBy: null,
    }),
  )
  const months = forecastMonths(query.data ?? [], range.months)
  const unknown = months.reduce((sum, month) => sum + month.unknownCount, 0)

  return (
    <QueryCard
      title={translate('forecast.title')}
      status={cardStatus(
        query,
        months.every((month) => month.outMinor === 0 && month.inMinor === 0 && month.unknownCount === 0),
      )}
      emptyText={translate('empty.forecast')}
      retryAction={query.refetch}
    >
      <ForecastView months={months} />
      <p className="text-caption text-text-secondary">{translate('forecast.note')}</p>
      {unknown > 0 && <p className="text-caption text-warning-text">{translate('unknownNote', { count: unknown })}</p>}
    </QueryCard>
  )
}
