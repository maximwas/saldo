'use client'

import { Info } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button.component'
import { Sheet } from '@/components/ui/sheet.component'
import { notify } from '@/components/ui/toaster.component'
import { useToday } from '@/contexts/clock.context'
import { useSubscriptionParams } from '../hooks/subscription-params.hook'
import { useSubscription, useUpdateSubscription } from '../hooks/subscriptions.hook'
import { type StatusChange, toStatusChangeInput } from '../schemas/subscription-form.schema'

type ConfirmStatusSheetProps = {
  subscriptionId: string
  /** pause: Figma Subscriptions · Pause 5:97627; archive: · Delete → archive 5:99845 / 5:100203 */
  kind: 'pause' | 'archive'
  onCloseAction: () => void
}

const CHANGE: Record<ConfirmStatusSheetProps['kind'], () => StatusChange> = {
  pause: () => ({ status: 'paused' }),
  archive: () => ({ archivedAt: new Date().toISOString() }),
}

// A pause or a removal from tracking: the unpaid payments from today leave the plan, the history stays. A subscription
// is never deleted (its payments are history, §8): «delete» archives it, with «Undo» in the toast (5:101229).
export function ConfirmStatusSheet({ subscriptionId, kind, onCloseAction }: ConfirmStatusSheetProps) {
  const translate = useTranslations(`subscriptions.${kind}`)
  const today = useToday()
  const { closeCard } = useSubscriptionParams()
  const { data: subscription } = useSubscription(subscriptionId)
  const update = useUpdateSubscription()

  if (!subscription) {
    return null
  }

  const undoArchive = () =>
    // the archive bumped the row's version by one (private.bump_version), so the undo is made from that version
    update.mutate(
      toStatusChangeInput(
        {
          ...subscription,
          version: subscription.version + 1,
        },
        { archivedAt: null },
        today,
      ),
    )

  const confirm = () =>
    update.mutate(toStatusChangeInput(subscription, CHANGE[kind](), today), {
      onSuccess: () => {
        onCloseAction()

        if (kind === 'archive') {
          closeCard()
          notify.undo(translate('done', { name: subscription.name }), { onUndo: undoArchive })

          return
        }

        notify.success(translate('done', { name: subscription.name }))
      },
    })

  return (
    <Sheet
      open
      onOpenChange={(open) => {
        if (!open) {
          onCloseAction()
        }
      }}
      title={translate('title', { name: subscription.name })}
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onCloseAction}>
            {translate('cancel')}
          </Button>
          <Button type="button" onClick={confirm} disabled={update.isPending}>
            {translate('confirm')}
          </Button>
        </>
      }
    >
      <p className="text-label text-text-secondary">{translate('hint', { name: subscription.name })}</p>
      <p className="flex gap-3 rounded-inner bg-primary-soft p-4 text-body-medium text-primary-text">
        <Info className="mt-0.5 size-5 shrink-0" aria-hidden />
        {translate('info')}
      </p>
    </Sheet>
  )
}
