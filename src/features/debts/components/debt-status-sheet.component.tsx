'use client'

import { useFormatter, useLocale, useTranslations } from 'next-intl'
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
  onCloseAction: () => void
}

// Figma «Saldo» → Personal debts, write-off state, Desktop 2:63716: a confirmation with the remaining amount; no money
// moves, so no account changes. A fully repaid debt is closed through the same confirmation.
export function DebtStatusSheet({ debt, status, onCloseAction }: DebtStatusSheetProps) {
  const translate = useTranslations('debts')
  const locale = useLocale()
  const format = useFormatter()
  const ledgerId = useLedgerStore((ledger) => ledger.ledgerId)
  const save = useSaveDebt()
  const writeOff = status === 'written_off'
  const arisenDay = format.dateTime(new Date(`${debt.arisenOn}T12:00:00Z`), {
    timeZone: 'UTC',
    day: '2-digit',
    month: '2-digit',
  })

  const confirm = () =>
    save.mutate(toStatusInput(debt, status, ledgerId), {
      onSuccess: () => {
        notify.success(translate(writeOff ? 'status.writtenOff' : 'status.closed'))
        onCloseAction()
      },
    })

  return (
    <Sheet
      open
      onOpenChange={(open) => !open && onCloseAction()}
      title={translate(writeOff ? 'status.writeOffTitle' : 'status.closeTitle')}
      footer={
        <>
          <Button variant="secondary" type="button" onClick={onCloseAction}>
            {translate(writeOff ? 'status.writeOffCancel' : 'status.cancel')}
          </Button>
          <Button type="button" variant={writeOff ? 'danger' : 'primary'} onClick={confirm} disabled={save.isPending}>
            {translate(writeOff ? 'status.writeOffConfirm' : 'status.closeConfirm')}
          </Button>
        </>
      }
    >
      {writeOff ? (
        <>
          <p className="text-body text-text-primary">
            {translate('status.writeOffBody', { remaining: formatMinor(debt.remainingMinor, debt.currency, locale) })}
          </p>
          <p className="text-label text-text-secondary">
            {debt.direction === 'owed_to_me'
              ? translate('status.writeOffNoteOwedToMe', { date: arisenDay })
              : translate('status.writeOffNoteIOwe')}
          </p>
        </>
      ) : (
        <p className="text-body text-text-primary">{translate('status.closeBody', { person: debt.person })}</p>
      )}
    </Sheet>
  )
}
