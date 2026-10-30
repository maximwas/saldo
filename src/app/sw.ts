/// <reference lib="webworker" />
import { defaultCache } from '@serwist/turbopack/worker'
import { NetworkOnly, type PrecacheEntry, Serwist, type SerwistGlobalConfig } from 'serwist'

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined
  }
}

declare const self: ServiceWorkerGlobalScope

// Supabase answers never go into a cache (defaultCache would keep cross-origin GETs): data and receipts must not outlive a
// sign-out or show another moment's money; the app keeps its own data in IndexedDB (plan 8.3)
const SUPABASE_PATH = /^\/(rest|storage|auth|functions|realtime)\/v1\//

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    {
      matcher: ({ url }) => SUPABASE_PATH.test(url.pathname),
      handler: new NetworkOnly(),
    },
    ...defaultCache,
  ],
  // a page never opened on this device has no cached copy: offline it gets the precached offline page
  fallbacks: {
    entries: [
      {
        url: '/~offline',
        matcher: ({ request }) => request.destination === 'document',
      },
    ],
  },
})

serwist.addEventListeners()

/** sent by src/features/notifications/api/web-push.server.ts */
type PushPayload = {
  title: string
  body: string
  linkPath: string | null
}

function readPayload(data: PushMessageData | null): PushPayload {
  const fallback: PushPayload = {
    title: 'Saldo',
    body: '',
    linkPath: null,
  }

  try {
    return {
      ...fallback,
      ...(data?.json() as Partial<PushPayload> | undefined),
    }
  } catch {
    return {
      ...fallback,
      body: data?.text() ?? '',
    }
  }
}

// Same-origin paths only, so a payload never sends the app elsewhere. An open window is reused, else a new one opens.
async function openLink(linkPath: unknown) {
  const url = new URL(typeof linkPath === 'string' ? linkPath : '/', self.location.origin)
  const target = url.origin === self.location.origin ? url.href : self.location.origin
  const [open] = await self.clients.matchAll({ type: 'window' })

  if (open) {
    await open.focus()

    return open.navigate(target)
  }

  return self.clients.openWindow(target)
}

// Always show a notification: Safari (iOS Home Screen) revokes the subscription of a worker whose push shows nothing
self.addEventListener('push', (event) => {
  const payload = readPayload(event.data)

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: '/pwa-192x192.png',
      data: {
        linkPath: payload.linkPath,
      },
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(openLink(event.notification.data?.linkPath))
})
