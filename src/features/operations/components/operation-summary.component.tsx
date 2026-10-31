import { useFormatter, useTranslations } from 'next-intl'
import { Amount } from '@/components/ui/amount.component'
import { useLedgerStore } from '@/contexts/ledger.context'
import type { Totals } from '../utils/operation-items.utils'

type OperationSummaryProps = {
  totals: Totals
  /** YYYY-MM of the period filter, or another value for all time */
  period: string
  /** the result minus the plans left to the month end (Figma «Plan caption»); null hides the line */
  withPlanMinor: number | null
}

// mobile 2:16064 shows sums at S (body-medium), desktop 2:11516 at M (number-sm)
const SUM_CLASS = 'lg:font-display lg:text-number-sm lg:font-semibold'

// Figma «Saldo» → SummaryStrip 2:10084 (Desktop 2:11516 / Mobile 2:16064): a card (padding 20, 16 on mobile, gap 12)
// with blocks on the subtle fill, radius md, padding 12/16, gap 4; desktop labels name the month. Mobile is a grid of
// two equal rows, the result spanning both columns; the result block ends with the «with plan to the month end» line (label).
export function OperationSummary({ totals, period, withPlanMinor }: OperationSummaryProps) {
  const baseCurrency = useLedgerStore((ledger) => ledger.baseCurrency)
  const translate = useTranslations('operations.totals')
  const formatter = useFormatter()
  const month = /^\d{4}-\d{2}$/.test(period)
    ? formatter.dateTime(new Date(`${period}-15T12:00:00Z`), {
        month: 'long',
        timeZone: 'UTC',
      })
    : null
  const label = (key: 'income' | 'expenses' | 'result') =>
    month && key !== 'result' ? (
      <>
        <span className="lg:hidden">{translate(key)}</span>
        <span className="max-lg:hidden">{translate(`${key}Of`, { month })}</span>
      </>
    ) : (
      translate(key)
    )
  const blocks = [
    {
      key: 'income' as const,
      minor: totals.incomeMinor,
      kind: 'income' as const,
      plus: totals.incomeMinor > 0,
    },
    {
      key: 'expenses' as const,
      minor: -totals.expenseMinor,
      kind: 'fact' as const,
      plus: false,
    },
    {
      key: 'result' as const,
      minor: totals.resultMinor,
      kind: totals.resultMinor > 0 ? ('income' as const) : ('fact' as const),
      plus: totals.resultMinor > 0,
    },
  ]

  return (
    <section className="flex flex-col gap-3 rounded-card bg-card p-4 shadow-card lg:p-5">
      <div className="grid auto-rows-fr grid-cols-2 gap-3 lg:grid-cols-3">
        {blocks.map((block) => (
          <div
            key={block.key}
            className={`flex flex-col gap-1 rounded-md bg-subtle px-4 py-3 ${block.key === 'result' ? 'col-span-2 lg:col-span-1' : ''}`}
          >
            <p className="text-label text-text-secondary">{label(block.key)}</p>
            <p>
              {block.plus ? <span className={`text-body font-medium text-positive-text ${SUM_CLASS}`}>+</span> : null}
              <Amount minor={block.minor} currency={baseCurrency} kind={block.kind} className={SUM_CLASS} />
            </p>
            {block.key === 'result' && withPlanMinor !== null ? (
              <p className="text-label text-text-secondary">
                {translate('withPlan')}: {withPlanMinor > 0 ? '+' : null}
                <Amount minor={withPlanMinor} currency={baseCurrency} kind="plan" className="text-label font-normal" />
              </p>
            ) : null}
          </div>
        ))}
      </div>
      {totals.unknownCount > 0 ? (
        <p className="text-caption text-text-tertiary">{translate('unknownRate', { count: totals.unknownCount })}</p>
      ) : null}
    </section>
  )
}
