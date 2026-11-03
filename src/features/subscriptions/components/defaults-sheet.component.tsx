'use client'

import { useTranslations } from 'next-intl'
import { useState } from 'react'
import { Banner } from '@/components/ui/banner.component'
import { Button } from '@/components/ui/button.component'
import { Field } from '@/components/ui/field.component'
import { Select } from '@/components/ui/select.component'
import { Sheet, SheetClose } from '@/components/ui/sheet.component'
import { notify } from '@/components/ui/toaster.component'
import { useLedgerStore } from '@/contexts/ledger.context'
import {
  useSetSubscriptionDefaults,
  useSubscriptionDefaults,
  useSubscriptionOptions,
} from '../hooks/subscriptions.hook'

const NO_ACCOUNT = 'none'

type DefaultsSheetProps = {
  onCloseAction: () => void
}

// Spec §8 «standard settings»: a new subscription starts from them, an existing one keeps its own (individual rules win,
// a change of the defaults never rewrites them). Reminder time, text, days and calendar join in phase 3. Owner only:
// the defaults live on the space row (ledgers RLS).
export function DefaultsSheet({ onCloseAction }: DefaultsSheetProps) {
  const translate = useTranslations('subscriptions.defaults')
  const ledgerId = useLedgerStore((ledger) => ledger.ledgerId)
  const defaults = useSubscriptionDefaults()
  const options = useSubscriptionOptions()
  const save = useSetSubscriptionDefaults()
  const [accountId, setAccountId] = useState<string | null>(null)
  const current = accountId ?? defaults.data?.defaults.account_id ?? NO_ACCOUNT

  const submit = () => {
    if (!defaults.data) {
      return
    }

    save.mutate(
      {
        ledgerId,
        expectedVersion: defaults.data.version,
        defaults: { account_id: current === NO_ACCOUNT ? null : current },
      },
      {
        onSuccess: () => {
          notify.success(translate('saved'))
          onCloseAction()
        },
      },
    )
  }

  return (
    <Sheet
      open
      onOpenChange={(open) => {
        if (!open) {
          onCloseAction()
        }
      }}
      title={translate('title')}
      footer={
        <>
          <SheetClose>{translate('cancel')}</SheetClose>
          <Button type="button" onClick={submit} disabled={save.isPending || !defaults.data}>
            {translate('save')}
          </Button>
        </>
      }
    >
      <Field label={translate('account')}>
        <Select
          value={current}
          onValueChange={(value) => setAccountId(value)}
          options={[
            {
              value: NO_ACCOUNT,
              label: translate('none'),
            },
            ...(options.data?.accounts ?? []).map((account) => ({
              value: account.id,
              label: account.name,
            })),
          ]}
        />
      </Field>
      <Banner>{translate('hint')}</Banner>
    </Sheet>
  )
}
