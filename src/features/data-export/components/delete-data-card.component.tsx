'use client'

import { useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useState } from 'react'
import { Button } from '@/components/ui/button.component'
import { Card } from '@/components/ui/card.component'
import { Field } from '@/components/ui/field.component'
import { Input } from '@/components/ui/input.component'
import { Sheet } from '@/components/ui/sheet.component'
import { notify } from '@/components/ui/toaster.component'
import { useLedgerStore } from '@/contexts/ledger.context'
import { getBrowserSupabase } from '@/lib/supabase/browser-client'
import { toPgError } from '@/lib/supabase/pg-error.utils'
import { deleteLedgerData } from '../api/data-export.api'

// Owner only (the page renders it for the owner, delete_ledger_data refuses anyone else with 42501). The space, its
// members and invites stay; everything in it goes. The red button unlocks once the space name is typed.
export function DeleteDataCard() {
  const translate = useTranslations('settings.data')
  const [open, setOpen] = useState(false)

  return (
    <Card title={translate('deleteTitle')}>
      <p className="text-label text-text-secondary">{translate('deleteHint')}</p>
      <Button variant="danger" className="cursor-pointer self-start" onClick={() => setOpen(true)}>
        {translate('delete')}
      </Button>
      {open ? <DeleteDataSheet onCloseAction={() => setOpen(false)} /> : null}
    </Card>
  )
}

type DeleteDataSheetProps = {
  onCloseAction: () => void
}

function DeleteDataSheet({ onCloseAction }: DeleteDataSheetProps) {
  const translate = useTranslations('settings.data')
  const translateError = useTranslations('errors.db')
  const router = useRouter()
  const queryClient = useQueryClient()
  const ledgerId = useLedgerStore((ledger) => ledger.ledgerId)
  const name = useLedgerStore((ledger) => ledger.ledgers.find((space) => space.id === ledger.ledgerId)?.name ?? '')
  const [typed, setTyped] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function confirm() {
    setPending(true)
    setError(null)

    try {
      await deleteLedgerData(getBrowserSupabase(), ledgerId)
      onCloseAction()
      notify.success(translate('deleted'))
      await queryClient.invalidateQueries()
      router.refresh()
    } catch (caught) {
      setError(translateError(toPgError(caught as { code?: string }).kind))
    } finally {
      setPending(false)
    }
  }

  return (
    <Sheet
      open
      onOpenChange={(next) => !next && onCloseAction()}
      title={translate('deleteTitle')}
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onCloseAction}>
            {translate('keep')}
          </Button>
          <Button type="button" variant="danger" disabled={pending || typed.trim() !== name} onClick={confirm}>
            {translate('confirm')}
          </Button>
        </>
      }
    >
      <p className="text-body text-text-secondary">{translate('deleteBody')}</p>
      <Field label={translate('typeName', { space: name })} error={error ?? undefined}>
        <Input value={typed} autoComplete="off" onChange={(event) => setTyped(event.target.value)} />
      </Field>
    </Sheet>
  )
}
