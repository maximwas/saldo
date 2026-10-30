'use client'

import { Info } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button.component'
import { Sheet } from '@/components/ui/sheet.component'
import { notify } from '@/components/ui/toaster.component'
import { useLedgerStore } from '@/contexts/ledger.context'
import { formatMinor } from '@/lib/money/money.utils'
import type { DebtRow } from '../api/debts.api'
import { useSaveDebt } from '../hooks/debts.hook'
import { toStatusInput } from '../schemas/debt-edit-form.schema'

type DebtStatusSheetProps = {
  debt: DebtRow
  /** settled: a debt already repaid in full is marked closed; written_off: what is left is forgiven */
  status: 'settled' | 'written_off'
  onClose: () => void
}

// Figma «Saldo» → Personal debts, write-off state, Desktop 2:63716: a confirmation with the remaining amount; no money
// moves, so no account changes. A fully repaid debt is closed through the same confirmation.
export function DebtStatusSheet({ debt, status, onClose }: DebtStatusSheetProps) {
  const translate = useTranslations('debts')
  const locale = useLocale()
  const ledgerId = useLedgerStore((ledger) => ledger.ledgerId)
  const save = useSaveDebt()
  const writeOff = status === 'written_off'

  const confirm = () =>
    save.mutate(toStatusInput(debt, status, ledgerId), {
      onSuccess: () => {
        notify.success(translate(writeOff ? 'status.writtenOff' : 'status.closed'))
        onClose()
      },
    })

  return (
    <Sheet
      open
      onOpenChange={(open) => !open && onClose()}
      title={translate(writeOff ? 'status.writeOffTitle' : 'status.closeTitle')}
      footer={
        <>
          <Button variant="secondary" type="button" onClick={onClose}>
            {translate('status.cancel')}
          </Button>
          <Button type="button" onClick={confirm} disabled={save.isPending}>
            {translate(writeOff ? 'status.writeOffConfirm' : 'status.closeConfirm')}
          </Button>
        </>
      }
    >
      <p className="flex gap-3 rounded-inner bg-primary-soft p-4 text-body-medium text-primary-text">
        <Info className="mt-0.5 size-5 shrink-0" aria-hidden />
        {writeOff
          ? translate('status.writeOffBody', {
              remaining: formatMinor(debt.remainingMinor, debt.currency, locale),
              person: debt.person,
            })
          : translate('status.closeBody', { person: debt.person })}
      </p>
    </Sheet>
  )
}
