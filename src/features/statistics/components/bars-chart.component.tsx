'use client'

import { useLocale } from 'next-intl'
import { Bar, BarChart, Legend, ResponsiveContainer, Tooltip, XAxis } from 'recharts'
import { formatMinor } from '@/lib/money/money.utils'

type BarsChartProps = {
  /** one object per category of the x axis: `label` and a number (minor units) or null per series key; null = no bar */
  data: Record<string, string | number | null>[]
  series: {
    key: string
    name: string
    /** a CSS colour from a theme token */
    fill: string
  }[]
  currency: string
  /** what a screen reader hears instead of the picture; the table has the figures */
  summary: string
}

// Figma «Saldo» → Statistics 2:73594 "Income vs expenses": rounded bars, no y axis, the label under each bar.
// The colours are theme tokens (var(--color-…)), so dark mode follows without a second palette.
export function BarsChart({ data, series, currency, summary }: BarsChartProps) {
  const locale = useLocale()

  return (
    <div role="img" aria-label={summary} className="h-64 w-full text-caption">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <XAxis
            dataKey="label"
            tickLine={false}
            stroke="var(--color-border)"
            tick={{ fill: 'var(--color-text-secondary)' }}
          />
          <Tooltip
            cursor={{ fill: 'var(--color-subtle)' }}
            contentStyle={{
              background: 'var(--color-raised)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text-primary)',
            }}
            formatter={(value) => formatMinor(Number(value), currency, locale)}
          />
          <Legend formatter={(name) => <span className="text-text-secondary">{name}</span>} />
          {series.map((item) => (
            <Bar
              isAnimationActive={false}
              key={item.key}
              dataKey={item.key}
              name={item.name}
              fill={item.fill}
              radius={4}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
