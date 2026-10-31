'use client'

import { LogOut } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useState } from 'react'
import { Button } from '@/components/ui/button.component'
import { notify } from '@/components/ui/toaster.component'
import { useLedgerStore } from '@/contexts/ledger.context'
import { getBrowserSupabase } from '@/lib/supabase/browser-client'
import { toPgError } from '@/lib/supabase/pg-error.utils'
import { cn } from '@/lib/utils/cn.utils'
import { removeMember } from '../api/access.api'
import { ConfirmSheet } from './confirm-sheet.component'

type LeaveSpaceButtonProps = {
  currentUserId: string
  ownerName: string
  className?: string
}

// Figma «Saldo» → Settings · read only (2:46979 in the Members card, 2:47206 full width under the mobile list) and the
// confirmation 2:47356: secondary button with Icon/log-out, then the sheet «Leave the space?»
export function LeaveSpaceButton({ currentUserId, ownerName, className }: LeaveSpaceButtonProps) {
  const router = useRouter()
  const ledgerId = useLedgerStore((ledger) => ledger.ledgerId)
  const ledgerName = useLedgerStore((ledger) => ledger.ledgers.find((item) => item.id === ledger.ledgerId)?.name ?? '')
  const translate = useTranslations('settings.access')
  const translateError = useTranslations('errors.db')
  const [open, setOpen] = useState(false)
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function changeOpen(next: boolean) {
    setOpen(next)
    setError(null)
  }

  // the active-space cookie still names this space; the server falls back to another one the person belongs to
  async function leave() {
    setIsPending(true)
    setError(null)

    try {
      await removeMember(getBrowserSupabase(), {
        ledgerId,
        userId: currentUserId,
      })
      setOpen(false)
      router.replace('/')
      router.refresh()
    } catch (caught) {
      const message = translateError(toPgError(caught as { code?: string }).kind)

      setError(message)
      notify.error(message)
    } finally {
      setIsPending(false)
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="secondary"
        className={cn('cursor-pointer', className)}
        onClick={() => setOpen(true)}
      >
        <LogOut aria-hidden className="size-5" />
        {translate('leave')}
      </Button>
      <ConfirmSheet
        open={open}
        onOpenChange={changeOpen}
        title={translate('leaveSheet.title', { space: ledgerName })}
        body={translate('leaveSheet.body', { owner: ownerName })}
        keepLabel={translate('leaveSheet.keep')}
        confirmLabel={translate('leaveSheet.confirm')}
        onConfirm={() => void leave()}
        pending={isPending}
        error={error}
      />
    </>
  )
}
