import { Progress } from '@base-ui/react/progress'
import { Pencil } from 'lucide-react'
import type { Route } from 'next'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Amount } from '@/components/ui/amount.component'
import { Button } from '@/components/ui/button.component'
import { CategoryIcon } from '@/components/ui/category-icon.component'
import { useCanWrite, useLedgerStore } from '@/contexts/ledger.context'
import { cn } from '@/lib/utils/cn.utils'
import { useBudgetSheetStore } from '@/store/budget-sheet.store'
import type { BudgetCategory } from '../api/budget.api'
import { type BudgetFact, limitProgress } from '../utils/budget.utils'
import { LimitNotes } from './limit-notes.component'

type LimitRowProps = {
  fact: BudgetFact
  category: BudgetCategory | null
  month: string
}

// Figma frame 2:12799: icon, name and fact on one line, the bar, then the remainder and "of limit · N %"
export function LimitRow({ fact, category, month }: LimitRowProps) {
  const translate = useTranslations('budget.limits')
  const currency = useLedgerStore((ledger) => ledger.baseCurrency)
  const canWrite = useCanWrite()
  const open = useBudgetSheetStore((state) => state.open)
  const progress = limitProgress(fact)
  const name = category?.name ?? translate('noCategory')

  return (
    <li className="flex items-start gap-3 py-3">
      <CategoryIcon icon={category?.icon ?? null} color={category?.color ?? null} />
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex items-baseline justify-between gap-3">
          {fact.categoryId ? (
            <Link
              href={`/operations?period=${month}&category=${fact.categoryId}&type=expense` as Route}
              aria-label={translate('operations', { name })}
              className="truncate rounded-xs text-body font-medium text-text-primary outline-none hover:underline focus-visible:ring-2 focus-visible:ring-primary"
            >
              {name}
            </Link>
          ) : (
            <span className="truncate text-body font-medium text-text-primary">{name}</span>
          )}
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
      {canWrite && fact.categoryId ? (
        <Button
          variant="ghost"
          size="s"
          aria-label={translate('edit', { name })}
          onClick={() =>
            open({
              kind: 'limit',
              categoryId: fact.categoryId,
            })
          }
        >
          <Pencil className="size-4" aria-hidden />
        </Button>
      ) : (
        canWrite && <span className="w-9 shrink-0" aria-hidden />
      )}
    </li>
  )
}
