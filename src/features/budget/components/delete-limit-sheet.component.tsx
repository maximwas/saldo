import { useTranslations } from 'next-intl'
import { useMoneyText } from '@/components/ui/amount.component'
import { Button } from '@/components/ui/button.component'
import { Sheet, SheetClose } from '@/components/ui/sheet.component'
import { notify } from '@/components/ui/toaster.component'
import { useLedger } from '@/contexts/ledger.context'
import { useIsSheetDialog } from '@/lib/utils/media-query.hook'
import { useBudgetSheetStore } from '@/store/budget-sheet.store'
import { useBudgetCategories, useCurrentBudget, useDeleteLimit, useRestoreLimit } from '../hooks/budget.hook'
import { useMonthLabel } from '../hooks/month-label.hook'

// Figma frames 2:24914 (desktop dialog) / 2:25401 (mobile sheet): what goes away and what stays (the operations); the desktop
// adds that later months keep their limits. Deleted 41:111016 / 2:28053: «Limit “X” deleted» with undo, which writes the limit back.
export function DeleteLimitSheet({ categoryId }: { categoryId: string }) {
  const translate = useTranslations('budget.deleteSheet')
  const moneyText = useMoneyText()
  const monthLabel = useMonthLabel()
  const { ledgerId, baseCurrency: currency } = useLedger()
  const desktop = useIsSheetDialog()
  const close = useBudgetSheetStore((state) => state.close)
  const { month, data } = useCurrentBudget()
  const { data: categories } = useBudgetCategories()
  const remove = useDeleteLimit()
  const restore = useRestoreLimit()
  const fact = data?.facts.find((row) => row.kind === 'expense' && row.categoryId === categoryId && row.limitId)
  const name = categories?.find((category) => category.id === categoryId)?.name ?? ''

  if (!fact?.limitId) {
    return null
  }

  const limitId = fact.limitId
  const limitMinor = fact.limitMinor
  const carryMode = fact.carryMode
  const monthId = data?.monthId
  const run = () =>
    remove.mutate(
      { limitId },
      {
        onSuccess: () => {
          close()

          if (monthId && limitMinor !== null) {
            notify.undo(translate('deleted', { name }), {
              onUndo: () =>
                restore.mutate({
                  ledgerId,
                  month,
                  monthId,
                  limitId: crypto.randomUUID(),
                  categoryId,
                  limitMinor,
                  carryMode,
                  expectedVersion: null,
                }),
            })
          }
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
          <SheetClose>{translate('cancel')}</SheetClose>
          <Button type="button" variant="danger" disabled={remove.isPending} onClick={run}>
            {translate(desktop ? 'confirmDesktop' : 'confirm')}
          </Button>
        </>
      }
    >
      <p className="text-label text-text-secondary">
        {translate('text', {
          amount: moneyText(fact.limitMinor ?? 0, currency),
          month: monthLabel(month, false),
          name,
          spent: moneyText(fact.factMinor, currency),
        })}
        {desktop ? ` ${translate('textNext')}` : null}
      </p>
    </Sheet>
  )
}
