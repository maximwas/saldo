import type { LedgerRole } from '@/types/supabase.types'

// shell UI texts in one place; i18n replaces this object later
export const SHELL_TEXT = {
  brand: 'Saldo',
  navLabel: 'Розділи',
  search: 'Пошук операцій',
  notifications: 'Сповіщення',
  add: 'Додати',
  currentSpace: 'Поточний',
  synced: 'Синхронізовано',
  stub: (title: string) => `Розділ «${title}» з'явиться згодом.`,
} as const

export const ROLE_LABELS: Record<LedgerRole, string> = {
  owner: 'Власник',
  editor: 'Редагує',
  viewer: 'Переглядає',
}
