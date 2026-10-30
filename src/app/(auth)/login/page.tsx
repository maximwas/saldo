import type { Metadata } from 'next'
import { Brand } from '@/features/auth/components/brand.component'
import { LoginForm } from '@/features/auth/components/login-form.component'

export const metadata: Metadata = { title: 'Вхід · Saldo' }

// Figma "Saldo", login 4:79954 (desktop: centred 440px card) and 4:79982 (mobile: brand above the card, note below)
export default function LoginPage() {
  return (
    <main className="flex min-h-dvh flex-col gap-6 bg-app px-5 pt-12 pb-8 md:items-center md:justify-center md:p-0">
      <Brand className="md:hidden" />
      <div className="flex flex-col rounded-card bg-card p-5 shadow-card md:w-110 md:p-8">
        <LoginForm />
      </div>
      <p className="text-caption text-text-secondary md:hidden">
        Реєстрації немає: акаунт створюється лише за запрошенням власника простору.
      </p>
    </main>
  )
}
