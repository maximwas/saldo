import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { Suspense } from 'react'
import { Brand } from '@/components/layout/brand.component'
import { LoginForm } from '@/features/auth/components/login-form.component'

export async function generateMetadata(): Promise<Metadata> {
  const translate = await getTranslations('auth')

  return { title: translate('metaTitle') }
}

// Figma "Saldo", login 4:79954 (desktop: centred 440px card) and 4:79982 (mobile: brand above the card, note below);
// brand, title and subtitle are centred; the mobile group is centred vertically, safe-center falls back to the top
// when it does not fit (short screen, keyboard open) so the form stays reachable (Maxim, 2026-10-30)
// server translations (Brand, the note) wait for the user's locale, a Supabase read: the page streams in <Suspense>
export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  )
}

function LoginContent() {
  return (
    <main className="flex min-h-dvh flex-col justify-center-safe gap-6 bg-app px-5 pt-12 pb-8 md:items-center md:justify-center md:p-0">
      <Brand className="self-center md:hidden" />
      <LoginForm />
    </main>
  )
}
