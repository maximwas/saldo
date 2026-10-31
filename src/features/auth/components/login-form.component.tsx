'use client'

import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { type SubmitEvent, useState } from 'react'
import { Brand } from '@/components/layout/brand.component'
import { Button } from '@/components/ui/button.component'
import { Field } from '@/components/ui/field.component'
import { Input } from '@/components/ui/input.component'
import { issueKey } from '@/lib/forms/issue-key.utils'
import { getBrowserSupabase } from '@/lib/supabase/browser-client'
import { loginFormSchema } from '../schemas/login-form.schema'
import { safeNextPath } from '../utils/safe-next.utils'

type Step = 'password' | 'code'

const CODE_LENGTH = 6

// Figma "Saldo", app states: login 4:79954 (desktop), 4:79982 (mobile), error 4:80005, TOTP code 4:80027.

export function LoginForm() {
  const router = useRouter()
  const translate = useTranslations('auth')
  const translateError = useTranslations('errors.auth')
  const translateField = useTranslations('errors')
  const [step, setStep] = useState<Step>('password')
  const [factorId, setFactorId] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  /** messages under the fields, before anything goes to Supabase */
  const [invalid, setInvalid] = useState<{
    email?: string
    password?: string
  }>({})
  const [isPending, setIsPending] = useState(false)

  function finish() {
    // read at submit time: the page stays static and needs no Suspense around useSearchParams
    const next = new URLSearchParams(window.location.search).get('next')

    router.replace(safeNextPath(next) as '/')
    router.refresh()
  }

  async function submitPassword(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const parsed = loginFormSchema.safeParse(
      {
        email: String(form.get('email')).trim(),
        password: String(form.get('password')),
      },
      { error: issueKey },
    )

    setInvalid(
      parsed.success
        ? {}
        : Object.fromEntries(
            parsed.error.issues.map((issue) => [issue.path[0], translateField(issue.message as 'required')]),
          ),
    )

    if (!parsed.success) {
      return
    }

    const supabase = getBrowserSupabase()

    setIsPending(true)
    setError(null)
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: parsed.data.email,
      password: parsed.data.password,
    })

    if (signInError) {
      setIsPending(false)
      setError(translateError(signInError.code === 'invalid_credentials' ? 'invalidCredentials' : 'signInFailed'))

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

  async function submitCode(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!factorId) {
      return
    }

    setIsPending(true)
    setError(null)
    const { error: verifyError } = await getBrowserSupabase().auth.mfa.challengeAndVerify({
      factorId,
      code,
    })

    if (verifyError) {
      setIsPending(false)
      setError(translateError('invalidCode'))

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
      <form onSubmit={submitCode} noValidate className="flex flex-col gap-4">
        <span className="flex size-10 items-center justify-center self-center rounded-full bg-cat-blue-soft">
          <ShieldCheckIcon />
        </span>
        <h1 className="text-center font-display text-number text-text-primary">{translate('codeTitle')}</h1>
        <p className="text-center text-body text-text-secondary">{translate('codeHint')}</p>
        <Field label={translate('code')} required error={error ?? undefined}>
          <Input
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            autoFocus
            value={code}
            onValueChange={(value) => setCode(value.replace(/\D/g, '').slice(0, CODE_LENGTH))}
          />
        </Field>
        <Button type="submit" className="w-full" disabled={code.length !== CODE_LENGTH || isPending}>
          {translate('confirm')}
        </Button>
        <Button type="button" variant="ghost" className="w-full" onClick={backToLogin}>
          {translate('backToLogin')}
        </Button>
      </form>
    )
  }

  return (
    <form onSubmit={submitPassword} noValidate className="flex flex-col gap-4 md:gap-5">
      <Brand className="hidden self-center md:flex" />
      <div className="flex flex-col items-center gap-1 text-center">
        <h1 className="font-display text-number text-text-primary md:text-page-title">{translate('title')}</h1>
        <p className="hidden text-body text-text-secondary md:block">{translate('subtitle')}</p>
      </div>
      <Field label={translate('email')} required error={invalid.email}>
        <Input name="email" type="email" autoComplete="email" />
      </Field>
      <Field label={translate('password')} required error={invalid.password ?? error ?? undefined}>
        <Input name="password" type="password" autoComplete="current-password" />
      </Field>
      <Button type="submit" className="w-full" disabled={isPending}>
        {translate('submit')}
      </Button>
      <div className="hidden gap-2 border-t border-border pt-4 text-caption md:flex">
        {/* icon box = one text line (h-lh), so the icon is centred on the first line, however many lines follow */}
        <span className="flex h-lh items-center">
          <InfoIcon />
        </span>
        <p className="flex-1 text-text-secondary">
          {translate('inviteOnly')} {translate('twoStepNote')}
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
