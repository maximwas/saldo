import { useMessages, useTranslations } from 'next-intl'
import type { QueuedWrite } from '@/lib/query/sync-queue.hook'
import { writeFields } from '../utils/write-fields.utils'

type WriteTitle = {
  /** the write's name (a new expense, a payment); a key with no text yet falls back to «change» */
  name: string
  /** the payee or title; null when the write has none */
  label: string | null
}

/** a queued write as a person names it, by its [feature, write] key (Figma 4:80805: name · payee) */
export function useWriteTitle() {
  const translate = useTranslations('sync.queue')
  const queue = useMessages().sync.queue
  const titles: Record<string, Partial<Record<string, string>> | string> = queue.writes
  const newOperation: Partial<Record<string, string>> = queue.newOperation

  return function writeTitle(write: QueuedWrite): WriteTitle {
    const [feature, name] = write.key as [string, string]
    const fields = writeFields(write.variables)
    const group = titles[feature]
    // a new operation is named by its kind, as Figma does
    const byKind =
      feature === 'operations' && name === 'createOperation' && fields.kind ? newOperation[fields.kind] : undefined

    return {
      name: byKind ?? (typeof group === 'object' ? group[name] : undefined) ?? translate('writes.other'),
      label: fields.label,
    }
  }
}
