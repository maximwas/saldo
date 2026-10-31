import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { deviceStorage } from '@/lib/offline/device-storage'

type DraftsState = {
  /** form key → its unsaved values */
  drafts: Record<string, unknown>
  save: (key: string, values: unknown) => void
  clear: (key: string) => void
}

// §22 «draft»: an unsaved form survives a closed sheet, a reload and a lost network. It lives in the device database
// (sign-out deletes it); skipHydration keeps it out of SSR, useFormDraft rehydrates it on the client.
export const useDraftsStore = create<DraftsState>()(
  persist(
    (set) => ({
      drafts: {},
      save: (key, values) =>
        set((state) => ({
          drafts: {
            ...state.drafts,
            [key]: values,
          },
        })),
      clear: (key) =>
        set((state) => ({
          drafts: Object.fromEntries(Object.entries(state.drafts).filter(([draftKey]) => draftKey !== key)),
        })),
    }),
    {
      name: 'drafts',
      storage: createJSONStorage(() => deviceStorage),
      skipHydration: true,
    },
  ),
)
