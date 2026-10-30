import type { Metadata } from 'next'
import localFont from 'next/font/local'
import { ThemeProvider } from 'next-themes'
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

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="uk" suppressHydrationWarning>
      <body className={`${fixelText.variable} ${fixelDisplay.variable}`}>
        <ThemeProvider attribute="data-theme">{children}</ThemeProvider>
      </body>
    </html>
  )
}
