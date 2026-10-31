'use client'

import { Info } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button.component'
import { Sheet } from '@/components/ui/sheet.component'
import { notify } from '@/components/ui/toaster.component'
import { useClock } from '@/contexts/clock.context'
import { formatMinor } from '@/lib/money/money.utils'
import { useAccountActivity, useUpdateAccount } from '../hooks/accounts.hook'
import type { AccountView } from '../utils/accounts.utils'

type ArchiveAccountSheetProps = {
  /** the account to archive; null = the sheet is closed */
  account: AccountView | null
  onCloseAction: () => void
}

// Figma «Saldo» (account delete → archive) 5:106214 / 5:106467: an account with operations is never deleted, only
// archived — the operations stay, the account leaves the lists and «Available». The body counts operations and
// transfers of the account; a single one is named by its date and title.
export function ArchiveAccountSheet({ account, onCloseAction }: ArchiveAccountSheetProps) {
  const translate = useTranslations('accounts')
  const locale = useLocale()
  const { timeZone } = useClock()
  const update = useUpdateAccount()
  const activity = useAccountActivity(account?.id ?? '', account !== null)

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

  const summaryOf = (target: AccountView) => {
    const balance = formatMinor(target.balanceMinor, target.currency, locale)
    const data = activity.data

    if (data === undefined) {
      return translate('archive.balanceOnly', { balance })
    }

    const only = data.count === 1 ? data.latest : null
    const date = only
      ? new Intl.DateTimeFormat(locale, {
          day: '2-digit',
          month: '2-digit',
          timeZone,
        }).format(new Date(only.occurredAt))
      : ''

    return translate('archive.summary', {
      count: data.count,
      detail: only ? ` (${only.title ? `${date}, «${only.title}»` : date})` : '',
      balance,
    })
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
          <p className="text-label text-text-secondary">{summaryOf(account)}</p>
          <p className="flex gap-3 rounded-inner bg-primary-soft px-4 py-3 text-body-medium text-primary-text">
            <span className="py-0.5">
              <Info className="size-5 shrink-0" aria-hidden />
            </span>
            <span className="flex-1">{translate('archive.info')}</span>
          </p>
        </>
      ) : null}
    </Sheet>
  )
}
