import type { Metadata } from 'next'
import localFont from 'next/font/local'
import { ThemeProvider } from 'next-themes'
import { Suspense } from 'react'
import { AppProviders } from '@/components/providers/app-providers.component'
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

export const metadata: Metadata = {
  title: 'Saldo',
  description: 'Особисті фінанси',
}

// Reads cookies, so it renders per request inside the Suspense boundary (cacheComponents)
async function Providers({ children }: { children: React.ReactNode }) {
  const ledger = await getActiveLedger()

  return <AppProviders ledger={ledger}>{children}</AppProviders>
}

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="uk" suppressHydrationWarning>
      <body className={`${fixelText.variable} ${fixelDisplay.variable}`}>
        <ThemeProvider attribute="data-theme">
          <Suspense>
            <Providers>{children}</Providers>
          </Suspense>
        </ThemeProvider>
      </body>
    </html>
  )
}
