// the same fact under the names writes and rows use: snake_case rows and RPC payloads, camelCase inputs
const ALIASES = {
  amountMinor: ['amount_minor', 'amountMinor', 'planned_amount_minor', 'plannedAmountMinor'],
  currency: ['currency'],
  date: ['occurred_on', 'occurredOn', 'due_on', 'dueOn', 'nextIncomeOn'],
  accountId: ['account_id', 'accountId'],
  note: ['note'],
  label: ['counterparty', 'title', 'name'],
} as const

export type WriteFields = {
  amountMinor: number | null
  currency: string | null
  date: string | null
  accountId: string | null
  note: string | null
  label: string | null
}

const asRecord = (value: unknown) =>
  typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {}

/** the fields a person recognises in any queued write or server row: amount, date, account, comment, payee */
export function writeFields(source: unknown): WriteFields {
  const input = asRecord(source)
  // a payment carries its operation, an edit its patch: their fields describe the write best
  const flat: Record<string, unknown> = {
    ...input,
    ...asRecord(input.newOperation),
    ...asRecord(input.patch),
  }

  return Object.fromEntries(
    Object.entries(ALIASES).map(([field, keys]) => [
      field,
      keys.map((key) => flat[key]).find((value) => value != null) ?? null,
    ]),
  ) as WriteFields
}

/** «keep mine» after a conflict: the same change against the server's current version */
export function withVersion(variables: unknown, version: number) {
  const input = asRecord(variables)

  if ('expectedVersion' in input) {
    return {
      ...input,
      expectedVersion: version,
    }
  }

  return 'version' in input
    ? {
        ...input,
        version,
      }
    : null
}
