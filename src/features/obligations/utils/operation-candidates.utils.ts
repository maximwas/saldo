type Candidate = {
  amountMinor: number
  currency: string
  occurredOn: string
}

type PlanTarget = {
  /** what the plan still waits for; null = unknown */
  amountMinor: number | null
  currency: string
  dueOn: string
}

const DAY_MS = 86_400_000

/** «Link an existing operation»: the same currency and amount first, then the nearest amount, then the day nearest to
 * the plan (QA 12.11: a 520 ₴ operation came first for a 250 ₴ plan, only because it was the newest) */
export function rankCandidates<T extends Candidate>(operations: readonly T[], plan: PlanTarget, limit: number): T[] {
  const amountGap = (operation: T) =>
    plan.amountMinor !== null && operation.currency === plan.currency
      ? Math.abs(operation.amountMinor - plan.amountMinor)
      : Number.POSITIVE_INFINITY
  const dayGap = (operation: T) => Math.abs(Date.parse(operation.occurredOn) - Date.parse(plan.dueOn)) / DAY_MS

  return [...operations]
    .sort((left, right) => amountGap(left) - amountGap(right) || dayGap(left) - dayGap(right))
    .slice(0, limit)
}
