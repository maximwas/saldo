import 'server-only'
import { buildPushHTTPRequest } from '@pushforge/builder'
import { env } from '@/lib/env'
import { logger } from '@/lib/logger/logger.server'

const log = logger.child({
  module: 'web-push',
})

// push services contact this address about the sender (architecture §7); the key pair belongs to the domain
const VAPID_SUBJECT = 'https://saldo.maksymvasianin.com'
const GONE_STATUSES = new Set([404, 410])

export type PushTarget = {
  endpoint: string
  p256dh: string
  auth: string
}

/** what the service worker shows: src/app/sw.ts reads the same fields */
export type PushPayload = {
  title: string
  body: string
  linkPath: string | null
}

/** gone = the browser dropped the subscription (404 / 410): the caller deletes it */
export type PushOutcome = 'sent' | 'gone' | 'failed'

/** VAPID keys are optional env (Vercel has none yet): without both, push is skipped and notifications stay in-app */
export function vapidPrivateKey(): string | null {
  if (!env.VAPID_PRIVATE_KEY || !env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) {
    return null
  }

  return env.VAPID_PRIVATE_KEY
}

function outcomeOf(status: number): PushOutcome {
  if (status >= 200 && status < 300) {
    return 'sent'
  }

  return GONE_STATUSES.has(status) ? 'gone' : 'failed'
}

/** one encrypted Web Push request; privateJWK is VAPID_PRIVATE_KEY, a JWK JSON string */
export async function sendWebPush(privateJWK: string, target: PushTarget, payload: PushPayload): Promise<PushOutcome> {
  try {
    const request = await buildPushHTTPRequest({
      privateJWK,
      subscription: {
        endpoint: target.endpoint,
        keys: {
          p256dh: target.p256dh,
          auth: target.auth,
        },
      },
      message: {
        payload,
        adminContact: VAPID_SUBJECT,
      },
    })
    const response = await fetch(request.endpoint, {
      method: 'POST',
      headers: request.headers,
      body: request.body,
    })

    return outcomeOf(response.status)
  } catch (error) {
    log.warn(
      {
        err: error,
      },
      'web push request failed',
    )

    return 'failed'
  }
}
