import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type UiState = {
  hideAmounts: boolean
  setHideAmounts: (hideAmounts: boolean) => void
}

// A per-device preference, so localStorage and not user_settings. skipHydration keeps the first client render equal to
// the server's (amounts shown); AppProviders rehydrates after mount.
export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      hideAmounts: false,
      setHideAmounts: (hideAmounts) => set({ hideAmounts }),
    }),
    {
      name: 'saldo-ui',
      skipHydration: true,
    },
  ),
)
