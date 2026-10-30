'use client'

import { Info } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button.component'
import { Sheet } from '@/components/ui/sheet.component'
import { notify } from '@/components/ui/toaster.component'
import { useLedgerStore } from '@/contexts/ledger.context'
import type { Credit } from '../api/credits.api'
import { useSaveCredit } from '../hooks/credits.hook'
import { creditProgress } from '../utils/credits.utils'

type CloseCreditSheetProps = {
  credit: Credit
  onCloseAction: () => void
}

// Figma «Saldo» → Credit card · Delete 2:55720 / 2:60455 with archive as the safe action: there is no delete RPC,
// so a credit is closed — save_credit cancels its unpaid installments, the paid ones and their operations stay
export function CloseCreditSheet({ credit, onCloseAction }: CloseCreditSheetProps) {
  const translate = useTranslations('credits')
  const ledgerId = useLedgerStore((ledger) => ledger.ledgerId)
  const save = useSaveCredit()
  const openCount = creditProgress(credit).openCount

  const close = () =>
    save.mutate(
      {
        credit: {
          id: credit.id,
          ledger_id: ledgerId,
          version: credit.version,
          status: 'closed',
        },
        installments: null,
      },
      {
        onSuccess: () => {
          notify.success(translate('close.done'))
          onCloseAction()
        },
      },
    )

  return (
    <Sheet
      open
      onOpenChange={(open) => !open && onCloseAction()}
      title={translate('close.title', { name: credit.name })}
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onCloseAction}>
            {translate('close.cancel')}
          </Button>
          <Button type="button" variant="danger" onClick={close} disabled={save.isPending}>
            {translate('close.confirm')}
          </Button>
        </>
      }
    >
      <p className="text-label text-text-secondary">{translate('close.text', { count: openCount })}</p>
      <p className="flex gap-3 rounded-inner bg-primary-soft p-4 text-label font-medium text-primary-text">
        <Info className="mt-0.5 size-5 shrink-0" aria-hidden />
        {translate('close.info')}
      </p>
    </Sheet>
  )
}
