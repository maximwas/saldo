import { useTranslations } from 'next-intl'
import { Amount } from '@/components/ui/amount.component'
import type { Totals } from '../utils/operation-items.utils'

type OperationSummaryProps = {
  totals: Totals
  baseCurrency: string
}

// Figma «Saldo» → SummaryStrip 2:10084 (Desktop 2:16059 / Mobile): a card with three blocks, subtle fill, radius md,
// padding 12/16, label text-label in secondary, the sum below it. The planned-payments block waits for 1.11.
export function OperationSummary({ totals, baseCurrency }: OperationSummaryProps) {
  const translate = useTranslations('operations.totals')
  const blocks = [
    {
      key: 'income' as const,
      minor: totals.incomeMinor,
      kind: 'income' as const,
      plus: true,
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
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {blocks.map((block) => (
          <div key={block.key} className="flex flex-col gap-1 rounded-md bg-subtle px-4 py-3">
            <p className="text-label text-text-secondary">{translate(block.key)}</p>
            <p>
              {block.plus ? <span className="font-display text-number-sm text-positive-text">+</span> : null}
              <Amount minor={block.minor} currency={baseCurrency} kind={block.kind} size="m" />
            </p>
          </div>
        ))}
      </div>
      {totals.unknownCount > 0 ? (
        <p className="text-caption text-text-tertiary">{translate('unknownRate', { count: totals.unknownCount })}</p>
      ) : null}
    </section>
  )
}
