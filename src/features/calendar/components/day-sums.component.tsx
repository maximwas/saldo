'use client'

import { useTranslations } from 'next-intl'
import { Amount } from '@/components/ui/amount.component'
import { useLedger } from '@/contexts/ledger.context'
import { cn } from '@/lib/utils/cn.utils'
import { type DayTotals, dayTotalLines } from '../utils/calendar.utils'

// Figma «Saldo» → a cell's Totals 51:126307 (caption label over caption-medium), the day card's Totals 57:128491
// (caption over label-semibold, side by side) and the list's day header (one line)
const LAYOUT = {
  cell: {
    list: 'flex flex-col gap-0.5',
    item: 'flex flex-col',
    value: 'text-caption font-medium',
  },
  panel: {
    list: 'flex flex-wrap gap-x-6 gap-y-2',
    item: 'flex flex-col gap-0.5',
    value: 'text-label font-semibold',
  },
  inline: {
    list: 'flex flex-wrap gap-x-3 gap-y-0.5',
    item: 'flex items-baseline gap-1',
    value: 'text-caption font-medium',
  },
} as const

type DaySumsProps = {
  totals: DayTotals | undefined
  layout: keyof typeof LAYOUT
  className?: string
}

/** «Spent −3 057,25 ₴», «Planned −1 583,25 ₴»: every sum of a day named, so a fact and a plan never look alike */
export function DaySums({ totals, layout, className }: DaySumsProps) {
  const translate = useTranslations('calendar')
  const { baseCurrency } = useLedger()
  const lines = dayTotalLines(totals)
  const classes = LAYOUT[layout]

  if (lines.length === 0) {
    return null
  }

  return (
    <dl className={cn(classes.list, className)}>
      {lines.map((line) => (
        <div key={line.key} className={classes.item}>
          <dt className="text-caption text-text-tertiary">{translate(`totals.${line.key}`)}</dt>
          <dd>
            <Amount minor={line.minor} currency={baseCurrency} kind={line.kind} className={classes.value} />
          </dd>
        </div>
      ))}
    </dl>
  )
}
