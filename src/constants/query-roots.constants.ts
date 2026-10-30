/** query-key roots whose data depends on money; keys are [root, ledgerId, …] (architecture §6) */
export const MONEY_QUERY_ROOTS = [
  'overview',
  'accounts',
  'categories',
  'currencies',
  'operations',
  'obligations',
] as const
