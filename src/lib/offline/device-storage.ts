import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister'
import { createStore, del, get, set, type UseStore } from 'idb-keyval'

// One IndexedDB database holds what this device keeps for the signed-in person: the query cache with the write queue,
// form drafts and receipt photos waiting for upload (architecture §6). Sign-out deletes it whole (plan 8.7).
let store: UseStore | null = null
// false once sign-out has started: a throttled cache write must not create the database again
let writable = true

function deviceStore() {
  store ??= createStore('saldo', 'device')

  return store
}

/** async key-value storage over the device database, for the TanStack persister and zustand persist */
export const deviceStorage = {
  getItem: async (key: string) => (await get<string>(key, deviceStore())) ?? null,
  setItem: async (key: string, value: string) => {
    if (writable) {
      await set(key, value, deviceStore())
    }
  },
  removeItem: (key: string) => del(key, deviceStore()),
}

/** the query cache and write queue of one person: another account signing in on this device never restores them */
export const createDevicePersister = (userId: string) =>
  createAsyncStoragePersister({
    storage: deviceStorage,
    key: `query-cache:${userId}`,
    // 1 s by default: a reload right after an offline save could lose the write; the first change persists at once
    throttleTime: 250,
  })

const receiptKey = (operationId: string) => `receipt:${operationId}`

/** a receipt photo waits here until its upload runs: offline that can be days, across reloads */
export const keepReceipt = (operationId: string, file: Blob) => set(receiptKey(operationId), file, deviceStore())

export const readReceipt = (operationId: string) => get<Blob>(receiptKey(operationId), deviceStore())

export const dropReceipt = (operationId: string) => del(receiptKey(operationId), deviceStore())

function deleteDatabase(name: string) {
  return new Promise<void>((resolve) => {
    const request = indexedDB.deleteDatabase(name)

    request.onsuccess = () => resolve()
    request.onerror = () => resolve()
    // another tab still holds it open: the delete finishes when that tab lets go
    request.onblocked = () => resolve()
  })
}

/** sign-out: IndexedDB (cache, queue, drafts, receipts) and the service worker's caches of this device */
export async function clearDeviceData() {
  writable = false
  await store?.('readonly', (objectStore) => objectStore.transaction.db.close())

  const databases = await indexedDB.databases()

  await Promise.all(databases.flatMap(({ name }) => (name ? [deleteDatabase(name)] : [])))

  const cacheNames = 'caches' in window ? await caches.keys() : []

  await Promise.all(cacheNames.map((name) => caches.delete(name)))
}
