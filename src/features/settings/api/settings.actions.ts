'use server'

import { cookies } from 'next/headers'
import { z } from 'zod'
import { LOCALE_COOKIE, LOCALES } from '@/i18n/locale.utils'
import { verifySession } from '@/lib/auth/dal.server'
import { getServerSupabase } from '@/lib/supabase/server-client'

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365

// user_settings wins over the cookie (src/i18n/request.ts), so both are written; the cookie keeps /login in the same
// language after sign-out. Setting a cookie in a Server Action re-renders the page in the new locale.
export async function setLocale(rawLocale: string) {
  const locale = z.enum(LOCALES).parse(rawLocale)
  const session = await verifySession()
  const supabase = await getServerSupabase()
  const { error } = await supabase.from('user_settings').update({ locale }).eq('user_id', session.userId)

  if (error) {
    throw new Error(error.message)
  }

  const cookieStore = await cookies()

  cookieStore.set(LOCALE_COOKIE, locale, {
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: ONE_YEAR_SECONDS,
  })
}
