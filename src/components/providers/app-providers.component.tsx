'use client'

import { QueryClientProvider } from '@tanstack/react-query'
import { useLocale } from 'next-intl'
import { NuqsAdapter } from 'nuqs/adapters/next/app'
import { useEffect, useState } from 'react'
import { Toaster } from 'sonner'
import { ClockProvider } from '@/contexts/clock.context'
import { type ActiveLedger, LedgerProvider } from '@/contexts/ledger.context'
import { makeQueryClient } from '@/lib/query/query-client'

const DEFAULT_TIME_ZONE = 'Europe/Kyiv'

export function AppProviders({ ledger, children }: { ledger: ActiveLedger | null; children: React.ReactNode }) {
  const [queryClient] = useState(makeQueryClient)
  const locale = useLocale()

  // <html lang> renders outside the Suspense boundary that reads the locale (cacheComponents), so it follows here
  useEffect(() => {
    document.documentElement.lang = locale
  }, [locale])

  return (
    <QueryClientProvider client={queryClient}>
      <NuqsAdapter>
        <LedgerProvider ledger={ledger}>
          <ClockProvider timeZone={ledger?.timeZone ?? DEFAULT_TIME_ZONE}>
            {children}
            <Toaster position="top-center" />
          </ClockProvider>
        </LedgerProvider>
      </NuqsAdapter>
    </QueryClientProvider>
  )
}
