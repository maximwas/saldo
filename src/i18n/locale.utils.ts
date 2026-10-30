import Negotiator from 'negotiator'
import { hasLocale } from 'next-intl'

export const LOCALES = ['uk', 'en'] as const
export type AppLocale = (typeof LOCALES)[number]
const DEFAULT_LOCALE: AppLocale = 'uk'

/** next-intl's own cookie name */
export const LOCALE_COOKIE = 'NEXT_LOCALE'
/** files messages/<locale>/<namespace>.json, merged into one object in src/i18n/request.ts */
export const MESSAGE_NAMESPACES = [
  'nav',
  'shell',
  'auth',
  'errors',
  'common',
  'settings',
  'overview',
  'obligations',
] as const

type LocaleSources = {
  settingsLocale?: string | null
  cookieLocale?: string | null
  acceptLanguage?: string | null
}

// user_settings.locale → NEXT_LOCALE cookie → Accept-Language → uk; an unknown value falls through to the next source
export function resolveLocale({ settingsLocale, cookieLocale, acceptLanguage }: LocaleSources): AppLocale {
  for (const candidate of [settingsLocale, cookieLocale]) {
    if (hasLocale(LOCALES, candidate)) {
      return candidate
    }
  }

  const negotiated = new Negotiator({ headers: { 'accept-language': acceptLanguage ?? '' } }).language([...LOCALES])

  return hasLocale(LOCALES, negotiated) ? negotiated : DEFAULT_LOCALE
}
