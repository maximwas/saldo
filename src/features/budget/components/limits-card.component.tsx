import { Plus } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button.component'
import { useCanWrite } from '@/contexts/ledger.context'
import { useBudgetSheetStore } from '@/store/budget-sheet.store'
import { useBudgetCategories } from '../hooks/budget.hook'
import { type BudgetFact, sortFacts } from '../utils/budget.utils'
import { LimitRow } from './limit-row.component'

type LimitsCardProps = {
  facts: readonly BudgetFact[]
  month: string
}

// Figma frame 2:12799 "limits by category": a row per expense category with a limit or a fact;
// a category without a limit shows its fact and no bar
export function LimitsCard({ facts, month }: LimitsCardProps) {
  const translate = useTranslations('budget.limits')
  const canWrite = useCanWrite()
  const open = useBudgetSheetStore((state) => state.open)
  const { data: categories } = useBudgetCategories()
  const rows = sortFacts(facts.filter((fact) => fact.kind === 'expense'))

  return (
    <section className="flex flex-col gap-3 rounded-card bg-card p-5 shadow-card lg:p-6">
      <header className="flex items-center justify-between gap-3">
        <h2 className="text-card-title text-text-primary">{translate('title')}</h2>
        {canWrite ? (
          <Button
            variant="ghost"
            size="s"
            onClick={() =>
              open({
                kind: 'limit',
                categoryId: null,
              })
            }
          >
            <Plus className="size-4" aria-hidden />
            {translate('add')}
          </Button>
        ) : null}
      </header>
      <p className="text-caption text-text-secondary">{translate('legend')}</p>
      {rows.length === 0 ? (
        <p className="py-6 text-center text-label text-text-secondary">{translate('empty')}</p>
      ) : (
        <ul className="flex flex-col">
          {rows.map((fact) => (
            <LimitRow
              key={fact.categoryId ?? 'none'}
              fact={fact}
              category={categories?.find((category) => category.id === fact.categoryId) ?? null}
              month={month}
            />
          ))}
        </ul>
      )}
    </section>
  )
}
