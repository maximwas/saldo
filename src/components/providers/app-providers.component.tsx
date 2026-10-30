'use client'

import { QueryClientProvider } from '@tanstack/react-query'
import { MotionConfig } from 'motion/react'
import { useLocale } from 'next-intl'
import { useTheme } from 'next-themes'
import { NuqsAdapter } from 'nuqs/adapters/next/app'
import { useEffect, useRef, useState } from 'react'
import { Toaster } from 'sonner'
import { MOTION } from '@/constants/motion.constants'
import type { AppTheme } from '@/constants/theme.constants'
import { ClockProvider } from '@/contexts/clock.context'
import { type ActiveLedger, LedgerProvider } from '@/contexts/ledger.context'
import { makeQueryClient } from '@/lib/query/query-client'

const DEFAULT_TIME_ZONE = 'Europe/Kyiv'
// default for every motion/react animation; reducedMotion="user" drops transform and layout motion under
// prefers-reduced-motion: reduce and keeps opacity
const MOTION_DEFAULTS = {
  duration: MOTION.duration.base,
  ease: MOTION.ease.emphasized,
}

type AppProvidersProps = {
  ledger: ActiveLedger | null
  /** user_settings.theme; null when signed out */
  theme: AppTheme | null
  children: React.ReactNode
}

export function AppProviders({ ledger, theme, children }: AppProvidersProps) {
  const [queryClient] = useState(makeQueryClient)
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

  // <html lang> renders outside the Suspense boundary that reads the locale (cacheComponents), so it follows here
  useEffect(() => {
    document.documentElement.lang = locale
  }, [locale])

  return (
    <QueryClientProvider client={queryClient}>
      <NuqsAdapter>
        <LedgerProvider ledger={ledger}>
          <ClockProvider timeZone={ledger?.timeZone ?? DEFAULT_TIME_ZONE}>
            <MotionConfig reducedMotion="user" transition={MOTION_DEFAULTS}>
              {children}
            </MotionConfig>
            <Toaster position="top-center" />
          </ClockProvider>
        </LedgerProvider>
      </NuqsAdapter>
    </QueryClientProvider>
  )
}
