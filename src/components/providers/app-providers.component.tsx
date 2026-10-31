'use client'

import { QueryClientProvider } from '@tanstack/react-query'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { MotionConfig } from 'motion/react'
import { useLocale } from 'next-intl'
import { useTheme } from 'next-themes'
import { NuqsAdapter } from 'nuqs/adapters/next/app'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Toaster } from '@/components/ui/toaster.component'
import { MOTION } from '@/constants/motion.constants'
import type { AppTheme } from '@/constants/theme.constants'
import { ClockProvider } from '@/contexts/clock.context'
import { LedgerProvider } from '@/contexts/ledger.context'
import { resumeWrites } from '@/lib/query/ledger-writes.mutations'
import type { ActiveLedger } from '@/store/ledger.store'
import { useUiStore } from '@/store/ui.store'
import { devicePersistOptions, makeAppQueryClient } from './app-writes.mutations'

const DEFAULT_TIME_ZONE = 'Europe/Kyiv'
// default for every motion/react animation; reducedMotion="user" drops transform and layout motion under
// prefers-reduced-motion: reduce and keeps opacity
const MOTION_DEFAULTS = {
  duration: MOTION.duration.base,
  ease: MOTION.ease.emphasized,
}

type AppProvidersProps = {
  ledger: ActiveLedger | null
  /** the signed-in person: their cache and write queue persist on this device; null when signed out */
  userId: string | null
  /** user_settings.theme; null when signed out */
  theme: AppTheme | null
  children: React.ReactNode
}

export function AppProviders({ ledger, userId, theme, children }: AppProvidersProps) {
  const [queryClient] = useState(makeAppQueryClient)
  const persistOptions = useMemo(() => (userId ? devicePersistOptions(userId) : null), [userId])
  const locale = useLocale()
  const { setTheme } = useTheme()
  const appliedTheme = useRef<AppTheme | null>(null)

  // next-themes paints the device's last choice before hydration (localStorage); the account's choice then wins, so
  // a theme picked on another device follows after sign-in or a reload. Applied once per server value: setTheme changes
  // identity on every pick, and re-running with the stale prop would undo the user's choice
  useEffect(() => {
    if (theme && theme !== appliedTheme.current) {
      appliedTheme.current = theme
      setTheme(theme)
    }
  }, [theme, setTheme])

  // the device's «hide amounts» choice lives in localStorage, which the server cannot read
  useEffect(() => {
    void useUiStore.persist.rehydrate()
  }, [])

  // <html lang> renders outside the Suspense boundary that reads the locale (cacheComponents), so it follows here
  useEffect(() => {
    document.documentElement.lang = locale
  }, [locale])

  const content = (
    <NuqsAdapter>
      <LedgerProvider ledger={ledger}>
        <ClockProvider timeZone={ledger?.timeZone ?? DEFAULT_TIME_ZONE}>
          <MotionConfig reducedMotion="user" transition={MOTION_DEFAULTS}>
            {children}
          </MotionConfig>
          <Toaster />
        </ClockProvider>
      </LedgerProvider>
    </NuqsAdapter>
  )

  if (!persistOptions) {
    return <QueryClientProvider client={queryClient}>{content}</QueryClientProvider>
  }

  // restored first (queries wait for it), then the queue resumes: setMutationDefaults ran in makeAppQueryClient
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={persistOptions}
      onSuccess={() => resumeWrites(queryClient)}
    >
      {content}
    </PersistQueryClientProvider>
  )
}
