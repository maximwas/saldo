import { useLocale, useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button.component'
import { Sheet } from '@/components/ui/sheet.component'
import { notify } from '@/components/ui/toaster.component'
import { useLedgerStore } from '@/contexts/ledger.context'
import { formatMinor } from '@/lib/money/money.utils'
import { useBudgetSheetStore } from '@/store/budget-sheet.store'
import { useBudgetCategories, useCurrentBudget, useDeleteLimit } from '../hooks/budget.hook'
import { useMonthLabel } from '../hooks/month-label.hook'

// Figma frame 2:24960: what goes away and what stays (the operations)
export function DeleteLimitSheet({ categoryId }: { categoryId: string }) {
  const translate = useTranslations('budget.deleteSheet')
  const locale = useLocale()
  const monthLabel = useMonthLabel()
  const currency = useLedgerStore((ledger) => ledger.baseCurrency)
  const close = useBudgetSheetStore((state) => state.close)
  const { month, data } = useCurrentBudget()
  const { data: categories } = useBudgetCategories()
  const remove = useDeleteLimit()
  const fact = data?.facts.find((row) => row.kind === 'expense' && row.categoryId === categoryId && row.limitId)
  const name = categories?.find((category) => category.id === categoryId)?.name ?? ''

  if (!fact?.limitId) {
    return null
  }

  const limitId = fact.limitId
  const run = () =>
    remove.mutate(
      { limitId },
      {
        onSuccess: () => {
          notify.success(translate('deleted'))
          close()
        },
      },
    )

  return (
    <Sheet
      open
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          close()
        }
      }}
      title={translate('title', { name })}
      footer={
        <>
          <Button type="button" variant="secondary" onClick={close}>
            {translate('cancel')}
          </Button>
          <Button type="button" variant="danger" disabled={remove.isPending} onClick={run}>
            {translate('confirm')}
          </Button>
        </>
      }
    >
      <p className="text-body text-text-secondary">
        {translate('text', {
          amount: formatMinor(fact.limitMinor ?? 0, currency, locale),
          month: monthLabel(month, false),
        })}
      </p>
    </Sheet>
  )
}
