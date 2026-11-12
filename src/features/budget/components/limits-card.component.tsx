import { useTranslations } from 'next-intl'
import { Card } from '@/components/ui/card.component'
import { useCanWrite } from '@/contexts/ledger.context'
import { useBudgetSheetStore } from '@/store/budget-sheet.store'
import { useBudgetCategories } from '../hooks/budget.hook'
import { type BudgetFact, sortFacts } from '../utils/budget.utils'
import { LimitRow } from './limit-row.component'

type LimitsCardProps = {
  facts: readonly BudgetFact[]
}

type LegendItemProps = {
  dot: string
  children: React.ReactNode
}

function LegendItem({ dot, children }: LegendItemProps) {
  return (
    <span className="flex items-center gap-2 text-caption text-text-secondary">
      <span aria-hidden className={`size-2 rounded-full ${dot}`} />
      {children}
    </span>
  )
}

// Figma frames 2:12959 (desktop) / 2:16213 (mobile): «Limits by category» (short on mobile) with «Add a limit»
// opening the new-limit sheet (a row opens its own limit), the legend, then a row per expense category with a limit or a fact; a category without a
// limit shows its fact and no bar
export function LimitsCard({ facts }: LimitsCardProps) {
  const translate = useTranslations('budget.limits')
  const canWrite = useCanWrite()
  const open = useBudgetSheetStore((state) => state.open)
  const { data: categories } = useBudgetCategories()
  const rows = sortFacts(facts.filter((fact) => fact.kind === 'expense'))

  return (
    <Card
      title={
        <h2 className="text-card-title text-text-primary">
          <span className="lg:hidden">{translate('titleShort')}</span>
          <span className="max-lg:hidden">{translate('title')}</span>
        </h2>
      }
      action={
        canWrite
          ? {
              label: (
                <>
                  <span className="lg:hidden">{translate('changeShort')}</span>
                  <span className="max-lg:hidden">{translate('change')}</span>
                </>
              ),
              onClickAction: () =>
                open({
                  kind: 'limit',
                  categoryId: null,
                }),
            }
          : undefined
      }
      className="min-w-0 flex-1"
    >
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 lg:gap-x-5">
        <LegendItem dot="bg-primary">{translate('legendFact')}</LegendItem>
        <LegendItem dot="bg-border-strong">{translate('legendPlan')}</LegendItem>
        <LegendItem dot="bg-warning">
          <span className="lg:hidden">{translate('legendOverShort')}</span>
          <span className="max-lg:hidden">{translate('legendOver')}</span>
        </LegendItem>
      </div>
      {rows.length === 0 ? (
        <p className="py-6 text-center text-label text-text-secondary">{translate('empty')}</p>
      ) : (
        <ul className="flex flex-col gap-5">
          {rows.map((fact) => (
            <LimitRow
              key={fact.categoryId ?? 'none'}
              fact={fact}
              category={categories?.find((category) => category.id === fact.categoryId) ?? null}
            />
          ))}
        </ul>
      )}
    </Card>
  )
}
