'use client'

import { useTranslations } from 'next-intl'
import { useState } from 'react'
import { Button } from '@/components/ui/button.component'
import { Sheet, SheetClose } from '@/components/ui/sheet.component'
import { notify } from '@/components/ui/toaster.component'
import { removePushDevice } from '@/features/notifications/api/notifications.api'
import { clearDeviceData } from '@/lib/offline/device-storage'
import { useSyncQueue } from '@/lib/query/sync-queue.hook'
import { getBrowserSupabase } from '@/lib/supabase/browser-client'

// the device cleanup is best effort: an IndexedDB request another connection holds (another tab, the worker) or a
// database closed under it must not keep a signed-out person on the page (QA 12.11, phone: cookie gone, no redirect)
const CLEANUP_LIMIT_MS = 3000

async function clearDeviceDataInTime() {
  try {
    await Promise.race([clearDeviceData(), new Promise((resolve) => setTimeout(resolve, CLEANUP_LIMIT_MS))])
  } catch {
    // what is left is keyed by this person (query-cache:<user id>): another account never restores it
  }
}

/** this device stops getting reminders: its push_subscriptions row goes while the session can still delete it */
async function forgetPushDevice() {
  try {
    const registration = await navigator.serviceWorker?.getRegistration()
    const subscription = await registration?.pushManager?.getSubscription()

    if (subscription) {
      await removePushDevice(getBrowserSupabase(), subscription.endpoint)
      await subscription.unsubscribe()
    }
  } catch {
    // best effort: a dead endpoint is removed by the reminders cron (404/410)
  }
}

/** Sign-out of this device only (scope local: the person's other devices stay signed in), then everything the device
 * kept goes: IndexedDB and the service worker caches (plan 8.7). false = Auth refused (offline): nothing is cleared. */
async function endSession() {
  await forgetPushDevice()

  const { error } = await getBrowserSupabase().auth.signOut({ scope: 'local' })

  if (error) {
    return false
  }

  await clearDeviceDataInTime()
  // a full load: nothing of the signed-in app (its query client, its persister) survives into /login
  window.location.replace('/login')

  return true
}

type SignOutConfirmProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** unsent writes in the device queue */
  count: number
  pending: boolean
  onConfirmAction: () => void
}

function SignOutConfirm({ open, onOpenChange, count, pending, onConfirmAction }: SignOutConfirmProps) {
  const translate = useTranslations('settings.signOut')

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={translate('confirmTitle')}
      footer={
        <>
          <SheetClose>{translate('cancel')}</SheetClose>
          <Button variant="danger" disabled={pending} onClick={onConfirmAction}>
            {translate('confirm')}
          </Button>
        </>
      }
    >
      <p className="text-body text-text-secondary">{translate('unsent', { count })}</p>
    </Sheet>
  )
}

/** Unsent writes would be lost, so `start` asks first in `confirmSheet`, which the caller renders: a menu item closes
 * its popup before the sheet opens. Offline the session stays and the person is told. */
export function useSignOut() {
  const translate = useTranslations('settings.signOut')
  const { queue } = useSyncQueue()
  const [confirming, setConfirming] = useState(false)
  const [pending, setPending] = useState(false)

  async function signOut() {
    setPending(true)

    if (!(await endSession())) {
      setPending(false)
      notify.error(translate('failed'))
    }
  }

  function start() {
    if (queue.length > 0) {
      setConfirming(true)
    } else {
      void signOut()
    }
  }

  return {
    start,
    pending,
    confirmSheet: (
      <SignOutConfirm
        open={confirming}
        onOpenChange={setConfirming}
        count={queue.length}
        pending={pending}
        onConfirmAction={() => void signOut()}
      />
    ),
  }
}
