import type { AppLocale } from '@/i18n/locale.utils'
import type auth from '../../messages/uk/auth.json'
import type common from '../../messages/uk/common.json'
import type errors from '../../messages/uk/errors.json'
import type nav from '../../messages/uk/nav.json'
import type settings from '../../messages/uk/settings.json'
import type shell from '../../messages/uk/shell.json'

// uk is the source of the key types; src/i18n/messages.test.ts keeps en in step
declare module 'next-intl' {
  interface AppConfig {
    Locale: AppLocale
    Messages: {
      auth: typeof auth
      common: typeof common
      errors: typeof errors
      nav: typeof nav
      settings: typeof settings
      shell: typeof shell
    }
  }
}
