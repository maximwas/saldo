// the first element of every query key that depends on money; a money mutation invalidates all of them (conventions §4.1)
const MONEY_QUERY_ROOTS = [
  'operations',
  'accounts',
  'categories',
  'currencies',
  'obligations',
  'credits',
  'debts',
  'reserves',
  'overview',
  'budget',
  'calendar',
  'statistics',
  'taxes',
] as const

export const isMoneyQuery = (query: { queryKey: readonly unknown[] }) =>
  (MONEY_QUERY_ROOTS as readonly unknown[]).includes(query.queryKey[0])
