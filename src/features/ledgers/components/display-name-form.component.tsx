'use client'

import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { type SubmitEvent, useState } from 'react'
import { Button } from '@/components/ui/button.component'
import { Card } from '@/components/ui/card.component'
import { Field } from '@/components/ui/field.component'
import { Input } from '@/components/ui/input.component'
import { notify } from '@/components/ui/toaster.component'
import { useLedgerStore } from '@/contexts/ledger.context'
import { getBrowserSupabase } from '@/lib/supabase/browser-client'
import { toPgError } from '@/lib/supabase/pg-error.utils'
import { setMyDisplayName } from '../api/access.api'

type DisplayNameFormProps = {
  name: string | null
}

// The member's own name in the active space, for every role (set_my_display_name). No Figma frame: the same Card + Field +
// Input as the space form next to it.
export function DisplayNameForm({ name: initialName }: DisplayNameFormProps) {
  const router = useRouter()
  const ledgerId = useLedgerStore((ledger) => ledger.ledgerId)
  const translate = useTranslations('settings.myName')
  const translateError = useTranslations('errors.db')
  const [name, setName] = useState(initialName ?? '')
  const [error, setError] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)

  async function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsPending(true)
    setError(null)

    try {
      await setMyDisplayName(getBrowserSupabase(), {
        ledgerId,
        name,
      })
      notify.success(translate('saved'))
      router.refresh()
    } catch (caught) {
      setError(translateError(toPgError(caught as { code?: string }).kind))
    } finally {
      setIsPending(false)
    }
  }

  return (
    <Card title={translate('title')}>
      <form onSubmit={submit} noValidate className="flex max-w-120 flex-col gap-4">
        <Field label={translate('label')} hint={translate('hint')} error={error ?? undefined}>
          <Input maxLength={60} value={name} onChange={(event) => setName(event.target.value)} />
        </Field>
        <Button type="submit" disabled={isPending} className="cursor-pointer self-start">
          {translate('save')}
        </Button>
      </form>
    </Card>
  )
}
