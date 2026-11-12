import { useTranslations } from 'next-intl'
import { toPgError } from './pg-error.utils'

/** what the person reads for a failed Supabase call: errors.db.<kind>, in a toast or inline */
export function useDbErrorText() {
  const translate = useTranslations('errors.db')

  return function dbErrorText(error: unknown) {
    return translate(toPgError(error as { code?: string }).kind)
  }
}
