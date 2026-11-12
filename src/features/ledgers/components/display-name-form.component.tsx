'use client'

import { useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { type SubmitEvent, useState } from 'react'
import { Button } from '@/components/ui/button.component'
import { Field } from '@/components/ui/field.component'
import { Input } from '@/components/ui/input.component'
import { notify } from '@/components/ui/toaster.component'
import { useLedgerStore } from '@/contexts/ledger.context'
import { MEMBERS_QUERY_ROOT } from '@/lib/members/members.hook'
import { getBrowserSupabase } from '@/lib/supabase/browser-client'
import { useDbErrorText } from '@/lib/supabase/db-error-text.hook'
import { setMyDisplayName } from '../api/access.api'

type DisplayNameFormProps = {
  name: string | null
}

// The member's own name in the active space, for every role (set_my_display_name), under the photo in the card
// of the name and photo card (Figma 11:72807 / 59:153000): Input 520 with its hint and the Secondary M save button.
export function DisplayNameForm({ name: initialName }: DisplayNameFormProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const ledgerId = useLedgerStore((ledger) => ledger.ledgerId)
  const translate = useTranslations('settings.myName')
  const dbErrorText = useDbErrorText()
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
      // the name in rows, the sidebar and the account card
      await queryClient.invalidateQueries({ queryKey: [MEMBERS_QUERY_ROOT] })
      router.refresh()
    } catch (caught) {
      setError(dbErrorText(caught))
    }

    setIsPending(false)
  }

  return (
    <form onSubmit={submit} noValidate className="flex max-w-130 flex-col gap-5">
      <Field label={translate('label')} hint={translate('hint')} error={error ?? undefined}>
        <Input maxLength={60} value={name} onChange={(event) => setName(event.target.value)} />
      </Field>
      <Button
        type="submit"
        variant="secondary"
        disabled={isPending}
        className="cursor-pointer self-stretch lg:self-start"
      >
        {translate('save')}
      </Button>
    </form>
  )
}
