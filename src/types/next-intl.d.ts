import type { AppLocale } from '@/i18n/locale.utils'
import type accounts from '../../messages/uk/accounts.json'
import type auth from '../../messages/uk/auth.json'
import type categories from '../../messages/uk/categories.json'
import type common from '../../messages/uk/common.json'
import type credits from '../../messages/uk/credits.json'
import type currencies from '../../messages/uk/currencies.json'
import type debts from '../../messages/uk/debts.json'
import type errors from '../../messages/uk/errors.json'
import type nav from '../../messages/uk/nav.json'
import type notifications from '../../messages/uk/notifications.json'
import type obligations from '../../messages/uk/obligations.json'
import type operations from '../../messages/uk/operations.json'
import type overview from '../../messages/uk/overview.json'
import type settings from '../../messages/uk/settings.json'
import type shell from '../../messages/uk/shell.json'
import type subscriptions from '../../messages/uk/subscriptions.json'

// uk is the source of the key types; src/i18n/messages.test.ts keeps en in step
declare module 'next-intl' {
  interface AppConfig {
    Locale: AppLocale
    Messages: {
      accounts: typeof accounts
      auth: typeof auth
      categories: typeof categories
      common: typeof common
      credits: typeof credits
      currencies: typeof currencies
      debts: typeof debts
      errors: typeof errors
      nav: typeof nav
      notifications: typeof notifications
      operations: typeof operations
      obligations: typeof obligations
      overview: typeof overview
      settings: typeof settings
      shell: typeof shell
      subscriptions: typeof subscriptions
    }
  }
}
