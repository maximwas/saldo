import { create } from 'zustand'

/** the one budget sheet that is open: rows and cards open it without passing callbacks down the tree */
type BudgetSheet =
  | {
      kind: 'limit'
      categoryId: string | null
    }
  | {
      kind: 'delete'
      categoryId: string
    }
  | { kind: 'income' }

type BudgetSheetState = {
  sheet: BudgetSheet | null
  open: (sheet: BudgetSheet) => void
  close: () => void
}

export const useBudgetSheetStore = create<BudgetSheetState>()((set) => ({
  sheet: null,
  open: (sheet) => set({ sheet }),
  close: () => set({ sheet: null }),
}))
