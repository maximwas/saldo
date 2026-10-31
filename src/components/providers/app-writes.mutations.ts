import type { PersistQueryClientOptions } from '@tanstack/react-query-persist-client'
import { accountsWrites } from '@/features/accounts/hooks/accounts.hook'
import { budgetWrites } from '@/features/budget/hooks/budget.hook'
import { calendarWrites } from '@/features/calendar/hooks/calendar.hook'
import { categoriesWrites } from '@/features/categories/hooks/categories.hook'
import { creditsWrites } from '@/features/credits/hooks/credits.hook'
import { currenciesWrites } from '@/features/currencies/hooks/currencies.hook'
import { debtsWrites } from '@/features/debts/hooks/debts.hook'
import { obligationsWrites } from '@/features/obligations/hooks/obligations.hook'
import { operationsWrites } from '@/features/operations/api/operations.mutations'
import { overviewWrites } from '@/features/overview/hooks/overview.hook'
import { subscriptionsWrites } from '@/features/subscriptions/hooks/subscriptions.hook'
import { createDevicePersister } from '@/lib/offline/device-storage'
import { registerWrites, shouldPersistWrite } from '@/lib/query/ledger-writes.mutations'
import { DEVICE_CACHE_MAX_AGE, DEVICE_CACHE_VERSION, makeQueryClient } from '@/lib/query/query-client'
import { reminderRulesWrites } from '@/lib/reminders/reminder-rule.hook'

// every write a feature can queue; composed here because features never import each other (conventions §3)
const APP_WRITES = [
  accountsWrites,
  budgetWrites,
  calendarWrites,
  categoriesWrites,
  creditsWrites,
  currenciesWrites,
  debtsWrites,
  obligationsWrites,
  operationsWrites,
  overviewWrites,
  subscriptionsWrites,
  reminderRulesWrites,
]

/** the app's client with every write's defaults registered: they must exist before the persisted queue is restored */
export function makeAppQueryClient() {
  const queryClient = makeQueryClient()

  for (const writes of APP_WRITES) {
    registerWrites(queryClient, writes)
  }

  return queryClient
}

/** persist the cache and the write queue of this person in the device database (plan 8.1) */
export const devicePersistOptions = (userId: string): Omit<PersistQueryClientOptions, 'queryClient'> => ({
  persister: createDevicePersister(userId),
  maxAge: DEVICE_CACHE_MAX_AGE,
  buster: DEVICE_CACHE_VERSION,
  dehydrateOptions: {
    shouldDehydrateMutation: shouldPersistWrite,
  },
})
