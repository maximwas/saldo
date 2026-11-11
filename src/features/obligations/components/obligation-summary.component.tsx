import { useTranslations } from 'next-intl'
import { Amount, useMoneyText } from '@/components/ui/amount.component'
import { useToday } from '@/contexts/clock.context'
import { useLedgerStore } from '@/contexts/ledger.context'
import { yearAware } from '@/lib/dates/day.utils'
import { useDayText } from '@/lib/dates/day-text.hook'
import type { ObligationRow } from '../api/obligations.api'
import { type CurrencyTotals, summarizePayments } from '../utils/obligation-summary.utils'

type ObligationSummaryProps = {
  open: readonly ObligationRow[]
}

// «15 922,57 ₴ + 2,99 $»: the base sum first, then each other currency as it is
function useTotalsText(totals: CurrencyTotals) {
  const moneyText = useMoneyText()
  const baseCurrency = useLedgerStore((ledger) => ledger.baseCurrency)
  const parts = [moneyText(totals.base, baseCurrency)]

  for (const { currency, minor } of totals.others) {
    parts.push(moneyText(minor, currency))
  }

  return parts.join(' + ')
}

function useOthersText(totals: CurrencyTotals) {
  const moneyText = useMoneyText()

  return totals.others.map(({ currency, minor }) => moneyText(minor, currency)).join(' + ')
}

// Figma «Saldo» → Upcoming payments, desktop Summary 2:12226: StatCards (padding 24, gap 12, label-medium, Amount L plan,
// caption tertiary) side by side with gap 24; mobile Summary 2:13299: one Card «Until 25 November» with label / amount
// rows (gap 12). «Covered by reserve» (2:12237) waits for reserves: nothing to show before them.
export function ObligationSummary({ open }: ObligationSummaryProps) {
  const translate = useTranslations('obligations.summary')
  const dayText = useDayText()
  const today = useToday()
  const baseCurrency = useLedgerStore((ledger) => ledger.baseCurrency)
  const summary = summarizePayments(open, baseCurrency)
  const plannedText = useTotalsText(summary.planned)
  const plannedOthers = useOthersText(summary.planned)
  const overdueText = useTotalsText(summary.overdue)

  if (summary.count === 0 || summary.untilOn === null) {
    return null
  }

  const short = dayText(summary.untilOn, yearAware('short', summary.untilOn, today))
  const long = dayText(summary.untilOn, yearAware('dayMonth', summary.untilOn, today))
  const caption = [
    translate('count', { count: summary.count }),
    plannedOthers ? translate('more', { amount: plannedOthers }) : null,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <>
      <div className="grid grid-cols-3 gap-6 max-lg:hidden">
        <section className="flex flex-col gap-3 rounded-card bg-card p-6 shadow-card">
          <h2 className="text-label font-medium text-text-secondary">{translate('plannedUntil', { date: short })}</h2>
          <Amount minor={summary.planned.base} currency={baseCurrency} kind="plan" size="l" />
          <p className="text-caption text-text-tertiary">{caption}</p>
        </section>
        {summary.overdue.count > 0 && (
          <section className="flex flex-col gap-3 rounded-card bg-card p-6 shadow-card">
            <h2 className="text-label font-medium text-text-secondary">{translate('overdue')}</h2>
            <Amount minor={summary.overdue.base} currency={baseCurrency} kind="plan" size="l" />
            <p className="text-caption text-text-tertiary">{translate('count', { count: summary.overdue.count })}</p>
          </section>
        )}
      </div>
      <section className="flex flex-col gap-5 rounded-card bg-card p-6 shadow-card lg:hidden">
        <h2 className="text-card-title text-text-primary">{translate('until', { date: long })}</h2>
        <dl className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <dt className="flex-1 text-label text-text-secondary">{translate('planned')}</dt>
            <dd className="text-body font-medium text-text-secondary tabular-nums">{plannedText}</dd>
          </div>
          {summary.overdue.count > 0 && (
            <div className="flex items-center justify-between">
              <dt className="flex-1 text-label text-text-secondary">{translate('overdue')}</dt>
              <dd className="text-body font-medium text-text-secondary tabular-nums">{overdueText}</dd>
            </div>
          )}
        </dl>
      </section>
    </>
  )
}
