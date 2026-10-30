// [root, ledgerId, …rest]: the caches of two spaces never mix, and root stays first for isMoneyQuery (architecture §6)
export function ledgerQueryKey<Rest extends readonly unknown[]>(root: string, ledgerId: string, ...rest: Rest) {
  return [root, ledgerId, ...rest] as const
}
