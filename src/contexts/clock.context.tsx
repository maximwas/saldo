'use client'

import { TZDate } from '@date-fns/tz'
import { createContext, use } from 'react'
import { localDate } from '@/lib/utils/clock.utils'

type Clock = {
  timeZone: string
  now: () => TZDate
}

const ClockContext = createContext<Clock | null>(null)

type ClockProviderProps = {
  timeZone: string
  children: React.ReactNode
}

export function ClockProvider({ timeZone, children }: ClockProviderProps) {
  return (
    <ClockContext
      value={{
        timeZone,
        now: () => TZDate.tz(timeZone),
      }}
    >
      {children}
    </ClockContext>
  )
}

export function useClock() {
  const clock = use(ClockContext)

  if (!clock) {
    throw new Error('useClock outside ClockProvider')
  }

  return clock
}

/** YYYY-MM-DD of «today» in the ledger time zone */
export function useToday() {
  const clock = useClock()

  return localDate(clock.now(), clock.timeZone)
}
