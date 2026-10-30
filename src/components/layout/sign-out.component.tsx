'use client'

import { useTranslations } from 'next-intl'
import { useState } from 'react'
import { Button } from '@/components/ui/button.component'
import { Sheet } from '@/components/ui/sheet.component'
import { notify } from '@/components/ui/toaster.component'
import { removePushDevice } from '@/features/notifications/api/notifications.api'
import { clearDeviceData } from '@/lib/offline/device-storage'
import { useSyncQueue } from '@/lib/query/sync-queue.hook'
import { getBrowserSupabase } from '@/lib/supabase/browser-client'

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
 * kept goes: IndexedDB and the service worker caches (plan 8.7). Offline Auth cannot end the session, so nothing is
 * cleared and the person is told. Unsent writes would be lost: a confirmation lists them first. */
export function SignOut() {
  const translate = useTranslations('settings.signOut')
  const { queue } = useSyncQueue()
  const [confirming, setConfirming] = useState(false)
  const [pending, setPending] = useState(false)

  async function signOut() {
    setPending(true)
    await forgetPushDevice()

    const { error } = await getBrowserSupabase().auth.signOut({ scope: 'local' })

    if (error) {
      setPending(false)
      notify.error(translate('failed'))

      return
    }

    await clearDeviceData()
    // a full load: nothing of the signed-in app (its query client, its persister) survives into /login
    window.location.replace('/login')
  }

  return (
    <>
      <Button
        variant="danger"
        disabled={pending}
        onClick={() => (queue.length > 0 ? setConfirming(true) : void signOut())}
      >
        {translate('action')}
      </Button>
      <Sheet
        open={confirming}
        onOpenChange={setConfirming}
        title={translate('confirmTitle')}
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirming(false)}>
              {translate('cancel')}
            </Button>
            <Button variant="danger" disabled={pending} onClick={() => void signOut()}>
              {translate('confirm')}
            </Button>
          </>
        }
      >
        <p className="text-body text-text-secondary">{translate('unsent', { count: queue.length })}</p>
      </Sheet>
    </>
  )
}
