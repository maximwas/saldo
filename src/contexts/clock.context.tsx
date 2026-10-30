'use client'

import { TZDate } from '@date-fns/tz'
import { createContext, use } from 'react'

type Clock = { timeZone: string; now: () => TZDate }

const ClockContext = createContext<Clock | null>(null)

export function ClockProvider({ timeZone, children }: { timeZone: string; children: React.ReactNode }) {
  return <ClockContext value={{ timeZone, now: () => TZDate.tz(timeZone) }}>{children}</ClockContext>
}

export function useClock() {
  const clock = use(ClockContext)

  if (!clock) {
    throw new Error('useClock outside ClockProvider')
  }

  return clock
}
