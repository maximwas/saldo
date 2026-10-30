import type { Metadata } from 'next'
import localFont from 'next/font/local'
import { NextIntlClientProvider } from 'next-intl'
import { getTranslations } from 'next-intl/server'
import { ThemeProvider } from 'next-themes'
import { Suspense } from 'react'
import { AppProviders } from '@/components/providers/app-providers.component'
import { ServiceWorker } from '@/components/providers/service-worker.component'
import { getActiveLedger } from '@/lib/auth/dal.server'
import './globals.css'

// Fixel by MacPaw (OFL, src/app/fonts/OFL.txt); the variables override --font-sans / --font-display from theme.css
const fixelText = localFont({
  src: [
    { path: './fonts/FixelText-Regular.woff2', weight: '400' },
    { path: './fonts/FixelText-Medium.woff2', weight: '500' },
    { path: './fonts/FixelText-SemiBold.woff2', weight: '600' },
  ],
  variable: '--font-sans',
})

const fixelDisplay = localFont({
  src: [{ path: './fonts/FixelDisplay-SemiBold.woff2', weight: '600' }],
  variable: '--font-display',
})

export async function generateMetadata(): Promise<Metadata> {
  const translate = await getTranslations('common')

  return { title: translate('brand'), description: translate('description') }
}

// Reads cookies (space, locale), so it renders per request inside the Suspense boundary (cacheComponents)
async function Providers({ children }: { children: React.ReactNode }) {
  const ledger = await getActiveLedger()

  return (
    <NextIntlClientProvider>
      <AppProviders ledger={ledger}>{children}</AppProviders>
    </NextIntlClientProvider>
  )
}

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="uk" suppressHydrationWarning>
      <body className={`${fixelText.variable} ${fixelDisplay.variable}`}>
        <ThemeProvider attribute="data-theme">
          <ServiceWorker>
            <Suspense>
              <Providers>{children}</Providers>
            </Suspense>
          </ServiceWorker>
        </ThemeProvider>
      </body>
    </html>
  )
}
