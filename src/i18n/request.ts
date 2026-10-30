import { cookies, headers } from 'next/headers'
import { getRequestConfig } from 'next-intl/server'
import { getUserLocale } from '@/lib/auth/dal.server'
import { type AppLocale, LOCALE_COOKIE, MESSAGE_NAMESPACES, resolveLocale } from './locale.utils'

// next-intl wants a zone for dates on the server and in the browser alike; the Topbar passes the space's own zone
const DEFAULT_TIME_ZONE = 'Europe/Kyiv'

async function loadMessages(locale: AppLocale) {
  const entries = await Promise.all(
    MESSAGE_NAMESPACES.map(
      async (namespace) => [namespace, (await import(`../../messages/${locale}/${namespace}.json`)).default] as const,
    ),
  )

  return Object.fromEntries(entries)
}

export default getRequestConfig(async () => {
  const [cookieStore, headerList, settingsLocale] = await Promise.all([cookies(), headers(), getUserLocale()])
  const locale = resolveLocale({
    settingsLocale,
    cookieLocale: cookieStore.get(LOCALE_COOKIE)?.value,
    acceptLanguage: headerList.get('accept-language'),
  })

  return {
    locale,
    timeZone: DEFAULT_TIME_ZONE,
    messages: await loadMessages(locale),
  }
})
