'use client'

import { Info } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Amount } from '@/components/ui/amount.component'
import { Button } from '@/components/ui/button.component'
import { Sheet } from '@/components/ui/sheet.component'
import { notify } from '@/components/ui/toaster.component'
import { useAccountOperationCount, useUpdateAccount } from '../hooks/accounts.hook'
import type { AccountView } from '../utils/accounts.utils'

type ArchiveAccountSheetProps = {
  /** the account to archive; null = the sheet is closed */
  account: AccountView | null
  onCloseAction: () => void
}

// Figma «Saldo» (account delete → archive) 5:106214 / 5:106467: an account with operations is never deleted, only
// archived — the operations stay, the account leaves the lists and «Available»
export function ArchiveAccountSheet({ account, onCloseAction }: ArchiveAccountSheetProps) {
  const translate = useTranslations('accounts')
  const update = useUpdateAccount()
  const operations = useAccountOperationCount(account?.id ?? '', account !== null)

  const archive = () => {
    if (!account) {
      return
    }

    update.mutate(
      {
        id: account.id,
        expectedVersion: account.version,
        patch: { archived_at: new Date().toISOString() },
      },
      {
        onSuccess: () => {
          notify.success(translate('archive.done'))
          onCloseAction()
        },
      },
    )
  }

  return (
    <Sheet
      open={account !== null}
      onOpenChange={(open) => {
        if (!open) {
          onCloseAction()
        }
      }}
      title={translate('archive.title', { name: account?.name ?? '' })}
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onCloseAction}>
            {translate('form.cancel')}
          </Button>
          <Button type="button" onClick={archive} disabled={update.isPending}>
            {translate('archive.confirm')}
          </Button>
        </>
      }
    >
      {account ? (
        <>
          <p className="text-label text-text-secondary">
            {operations.data === undefined
              ? translate('archive.balanceOnly')
              : translate('archive.summary', { count: operations.data })}{' '}
            <Amount minor={account.balanceMinor} currency={account.currency} className="text-label font-medium" />
          </p>
          <p className="flex gap-3 rounded-inner bg-primary-soft p-4 text-body-medium text-primary-text">
            <Info className="mt-0.5 size-5 shrink-0" aria-hidden />
            {translate('archive.info')}
          </p>
        </>
      ) : null}
    </Sheet>
  )
}
