'use client'

import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'

type InsightsEvent = {
  url: string
}

// Query strings may carry search text or ids in later phases; Vercel gets the path only
function withoutQuery<Event extends InsightsEvent>(event: Event): Event {
  return {
    ...event,
    url: event.url.split('?')[0] ?? event.url,
  }
}

export function VercelInsights() {
  return (
    <>
      <Analytics beforeSend={withoutQuery} />
      <SpeedInsights beforeSend={withoutQuery} />
    </>
  )
}
