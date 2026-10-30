// Roots of query keys whose data depends on money: every money write refreshes them (architecture §6)
export const MONEY_QUERY_ROOTS = [
  'operations',
  'accounts',
  'obligations',
  'reserves',
  'overview',
  'budget',
  'calendar',
  'statistics',
  'taxes',
] as const

type QueryLike = { queryKey: readonly unknown[] }

/** a money query of this space only: the cache of another space stays as it is */
export const isLedgerMoneyQuery = (ledgerId: string) => (query: QueryLike) =>
  (MONEY_QUERY_ROOTS as readonly unknown[]).includes(query.queryKey[0]) && query.queryKey[1] === ledgerId
