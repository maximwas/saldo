'use client'

import { useRouter } from 'next/navigation'
import { type FormEvent, useId, useState } from 'react'
import { Button } from '@/components/ui/button.component'
import { Input } from '@/components/ui/input.component'
import { getBrowserSupabase } from '@/lib/supabase/browser-client'
import { safeNextPath } from '../utils/safe-next.utils'
import { Brand } from './brand.component'

type Step = 'password' | 'code'

const CODE_LENGTH = 6

// Figma "Saldo", app states: login 4:79954 (desktop), 4:79982 (mobile), error 4:80005, TOTP code 4:80027.
// Field height and padding come from the frames (48px, 16px): the shared Input is 44px / 12px.
const FIELD_CLASS = 'h-12 px-4'

export function LoginForm() {
  const router = useRouter()
  const ids = { email: useId(), password: useId(), passwordHint: useId(), code: useId(), codeHint: useId() }
  const [step, setStep] = useState<Step>('password')
  const [factorId, setFactorId] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)

  function finish() {
    // read at submit time: the page stays static and needs no Suspense around useSearchParams
    const next = new URLSearchParams(window.location.search).get('next')

    router.replace(safeNextPath(next) as '/')
    router.refresh()
  }

  async function submitPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const supabase = getBrowserSupabase()

    setIsPending(true)
    setError(null)
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: String(form.get('email')),
      password: String(form.get('password')),
    })

    if (signInError) {
      setIsPending(false)
      setError(
        signInError.code === 'invalid_credentials'
          ? 'Невірний email або пароль'
          : 'Не вдалося увійти. Спробуйте ще раз',
      )
      return
    }

    const { data: level } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()

    if (level?.nextLevel === 'aal2' && level.currentLevel !== 'aal2') {
      const { data: factors } = await supabase.auth.mfa.listFactors()

      setFactorId(factors?.totp[0]?.id ?? null)
      setStep('code')
      setIsPending(false)
      return
    }

    finish()
  }

  async function submitCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!factorId) {
      return
    }

    setIsPending(true)
    setError(null)
    const { error: verifyError } = await getBrowserSupabase().auth.mfa.challengeAndVerify({ factorId, code })

    if (verifyError) {
      setIsPending(false)
      setError('Невірний код. Спробуйте ще раз')
      return
    }

    finish()
  }

  async function backToLogin() {
    await getBrowserSupabase().auth.signOut()
    setStep('password')
    setCode('')
    setError(null)
  }

  if (step === 'code') {
    return (
      <form onSubmit={submitCode} className="flex flex-col gap-4">
        <span className="flex size-10 items-center justify-center rounded-full bg-cat-blue-soft">
          <ShieldCheckIcon />
        </span>
        <h1 className="font-display text-number text-text-primary">Код підтвердження</h1>
        <p className="text-body text-text-secondary">Введіть 6 цифр із застосунку-автентифікатора.</p>
        <div className="flex flex-col gap-1.5">
          <label htmlFor={ids.code} className="text-label font-medium text-text-secondary">
            Код
          </label>
          <Input
            id={ids.code}
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            autoFocus
            value={code}
            onValueChange={(value) => setCode(value.replace(/\D/g, '').slice(0, CODE_LENGTH))}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? ids.codeHint : undefined}
            className={FIELD_CLASS}
          />
          {error ? (
            <p id={ids.codeHint} className="text-caption text-negative-text">
              {error}
            </p>
          ) : null}
        </div>
        <Button type="submit" className="w-full" disabled={code.length !== CODE_LENGTH || isPending}>
          Підтвердити
        </Button>
        <Button type="button" variant="ghost" className="w-full" onClick={backToLogin}>
          Назад до входу
        </Button>
      </form>
    )
  }

  return (
    <form onSubmit={submitPassword} className="flex flex-col gap-4 md:gap-5">
      <Brand className="hidden md:flex" />
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-number text-text-primary md:text-page-title">Вхід</h1>
        <p className="hidden text-body text-text-secondary md:block">Email і пароль вашого акаунта</p>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor={ids.email} className="text-label font-medium text-text-secondary">
          Email
        </label>
        <Input id={ids.email} name="email" type="email" autoComplete="email" required className={FIELD_CLASS} />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor={ids.password} className="text-label font-medium text-text-secondary">
          Пароль
        </label>
        <Input
          id={ids.password}
          name="password"
          type="password"
          autoComplete="current-password"
          required
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? ids.passwordHint : undefined}
          className={FIELD_CLASS}
        />
        {error ? (
          <p id={ids.passwordHint} className="text-caption text-negative-text">
            {error}
          </p>
        ) : null}
      </div>
      <Button type="submit" className="w-full" disabled={isPending}>
        Увійти
      </Button>
      <div className="hidden gap-2 border-t border-border pt-4 md:flex">
        <InfoIcon />
        <p className="flex-1 text-caption text-text-secondary">
          Реєстрації немає: акаунт створюється лише за запрошенням власника простору. Якщо ввімкнено двоетапний вхід,
          далі попросимо код.
        </p>
      </div>
    </form>
  )
}

// Figma Icon/info 4:79979: two strokes in different tokens do not fit a single-colour icon component
function InfoIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" fill="none" className="size-4 shrink-0 stroke-text-primary">
      <path
        d="M8 10.667V8m0-2.667h.007M14.667 8A6.667 6.667 0 1 1 1.333 8a6.667 6.667 0 0 1 13.334 0Z"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// Figma Icon/shield-check I4:80033;2:7804: shield in primary, check in text-primary
function ShieldCheckIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="size-5" strokeWidth="1.66667">
      <path
        d="M16.666 10.833c0 4.167-2.916 6.25-6.383 7.458a.833.833 0 0 1-.558-.008C6.25 17.083 3.333 15 3.333 10.833V5a.833.833 0 0 1 .833-.834c1.667 0 3.75-1 5.2-2.266a.975.975 0 0 1 1.267 0c1.458 1.275 3.533 2.266 5.2 2.266a.833.833 0 0 1 .833.834Z"
        className="stroke-primary"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="m7.5 10 1.667 1.667L12.5 8.333"
        className="stroke-text-primary"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
