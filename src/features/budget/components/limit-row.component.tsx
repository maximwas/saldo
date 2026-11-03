import { Progress } from '@base-ui/react/progress'
import { useTranslations } from 'next-intl'
import { Amount } from '@/components/ui/amount.component'
import { CategoryBadge } from '@/components/ui/category-badge.component'
import { useRipple } from '@/components/ui/ripple.hook'
import { useCanWrite, useLedgerStore } from '@/contexts/ledger.context'
import { cn } from '@/lib/utils/cn.utils'
import { useBudgetSheetStore } from '@/store/budget-sheet.store'
import type { BudgetCategory } from '../api/budget.api'
import { type BudgetFact, limitProgress } from '../utils/budget.utils'
import { LimitNotes } from './limit-notes.component'

type LimitRowProps = {
  fact: BudgetFact
  category: BudgetCategory | null
}

// Figma frames 2:12991 / 2:16245: a 40 badge (the category colour), name and fact on one line, the 8 px bar, then the
// remainder and «of limit · N %»; gap 12 / 8. A writer taps the row to change its limit (ripple, hover as the rows); an
// over-limit row opens the «over the limit» variant of the sheet (2:30757).
export function LimitRow({ fact, category }: LimitRowProps) {
  const translate = useTranslations('budget.limits')
  const currency = useLedgerStore((ledger) => ledger.baseCurrency)
  const canWrite = useCanWrite()
  const open = useBudgetSheetStore((state) => state.open)
  const { pressProps, ripple } = useRipple()
  const progress = limitProgress(fact)
  const name = category?.name ?? translate('noCategory')
  const categoryId = fact.categoryId
  const content = (
    <>
      <CategoryBadge icon={category?.icon ?? null} color={category?.color ?? null} />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex items-baseline gap-2">
          <span className="min-w-0 flex-1 truncate text-body font-medium text-text-primary">{name}</span>
          <Amount minor={fact.factMinor} currency={currency} />
        </div>
        {progress.state === 'none' ? null : (
          <Progress.Root value={progress.barPercent} aria-label={name}>
            <Progress.Track className="h-2 overflow-hidden rounded-full bg-subtle">
              <Progress.Indicator
                className={cn('h-full rounded-full', progress.state === 'over' ? 'bg-warning' : 'bg-primary')}
              />
            </Progress.Track>
          </Progress.Root>
        )}
        <LimitNotes fact={fact} progress={progress} />
      </div>
    </>
  )

  return (
    <li className="flex flex-col">
      {canWrite && categoryId ? (
        <button
          type="button"
          aria-label={translate('edit', { name })}
          {...pressProps}
          onClick={() =>
            open({
              kind: 'limit',
              categoryId,
            })
          }
          className="relative -m-2 flex cursor-pointer items-center gap-3 overflow-hidden rounded-md p-2 text-left outline-none transition-colors hover:bg-subtle focus-visible:ring-2 focus-visible:ring-primary"
        >
          {content}
          {ripple}
        </button>
      ) : (
        <div className="flex items-center gap-3">{content}</div>
      )}
    </li>
  )
}
