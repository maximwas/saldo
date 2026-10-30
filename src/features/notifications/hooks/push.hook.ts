import { useCallback, useEffect, useState } from 'react'
import { notify } from '@/components/ui/toaster.component'
import { env } from '@/lib/env'
import { getBrowserSupabase } from '@/lib/supabase/browser-client'
import { removePushDevice, savePushDevice } from '../api/notifications.api'
import { needsHomeScreen, vapidKeyBytes } from '../utils/push.utils'

// checking → one of the rest once the browser is asked (nothing of it exists during SSR)
export type PushState = 'checking' | 'unavailable' | 'homeScreen' | 'denied' | 'off' | 'on'

const VAPID_KEY = env.NEXT_PUBLIC_VAPID_PUBLIC_KEY

async function currentSubscription() {
  const registration = await navigator.serviceWorker.getRegistration()

  return registration?.pushManager.getSubscription() ?? null
}

const supportsPush = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window

// the Permissions API first: it reports a grant the Notification.permission property of headless browsers misses
async function notificationPermission(): Promise<NotificationPermission> {
  try {
    const { state } = await navigator.permissions.query({ name: 'notifications' })

    return state === 'prompt' ? 'default' : state
  } catch {
    return Notification.permission
  }
}

async function detectState(): Promise<PushState> {
  const standalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true

  if (
    needsHomeScreen({
      userAgent: navigator.userAgent,
      maxTouchPoints: navigator.maxTouchPoints,
      standalone,
    })
  ) {
    return 'homeScreen'
  }

  if (!VAPID_KEY || !supportsPush()) {
    return 'unavailable'
  }

  const permission = await notificationPermission()

  if (permission === 'denied') {
    return 'denied'
  }

  return permission === 'granted' && (await currentSubscription()) ? 'on' : 'off'
}

async function subscribe(key: string) {
  const registration = await navigator.serviceWorker.ready
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: vapidKeyBytes(key),
  })
  const { endpoint, keys } = subscription.toJSON()

  await savePushDevice(getBrowserSupabase(), {
    endpoint: endpoint ?? subscription.endpoint,
    p256dh: keys?.p256dh ?? '',
    auth: keys?.auth ?? '',
    userAgent: navigator.userAgent,
  })
}

/** Web Push on this device: the permission prompt only ever comes from `enable`, which a click calls (plan 3.6) */
export function usePush(failedMessage: string) {
  const [state, setState] = useState<PushState>('checking')

  useEffect(() => {
    void detectState().then(setState)
  }, [])

  const enable = useCallback(async () => {
    if (!VAPID_KEY) {
      return
    }

    try {
      const permission = await Notification.requestPermission()

      if (permission === 'granted') {
        await subscribe(VAPID_KEY)
      }

      // the answer itself decides «denied»: the stored permission can lag behind it
      setState(permission === 'denied' ? 'denied' : await detectState())
    } catch {
      notify.error(failedMessage)
    }
  }, [failedMessage])

  const disable = useCallback(async () => {
    try {
      const subscription = await currentSubscription()

      if (subscription) {
        await removePushDevice(getBrowserSupabase(), subscription.endpoint)
        await subscription.unsubscribe()
      }

      setState('off')
    } catch {
      notify.error(failedMessage)
    }
  }, [failedMessage])

  return {
    state,
    enable,
    disable,
  }
}
