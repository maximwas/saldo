import { queryOptions, useQuery, useQueryClient } from '@tanstack/react-query'
import { useLedgerStore } from '@/contexts/ledger.context'
import { ledgerQueryKey } from '@/lib/query/query-keys.utils'
import { useLedgerWrite } from '@/lib/query/use-ledger-write.hook'
import { getBrowserSupabase } from '@/lib/supabase/browser-client'
import {
  getReminderRule,
  type ReminderRule,
  type ReminderRulePatch,
  type ReminderSourceType,
  saveReminderRule,
} from './reminder-rules.api'

const ruleQuery = (ledgerId: string, sourceType: ReminderSourceType, sourceId: string) =>
  queryOptions({
    queryKey: ledgerQueryKey('reminder-rules', ledgerId, sourceType, sourceId),
    queryFn: () =>
      getReminderRule(getBrowserSupabase(), {
        ledgerId,
        sourceType,
        sourceId,
      }),
  })

/** the rule of one subscription / credit / debt plus the one write of it; shared by the three cards (features never import each other) */
export function useReminderRule(sourceType: ReminderSourceType, sourceId: string) {
  const ledgerId = useLedgerStore((ledger) => ledger.ledgerId)
  const queryClient = useQueryClient()
  const query = useQuery(ruleQuery(ledgerId, sourceType, sourceId))
  const write = useLedgerWrite(saveReminderRule)
  const save = (rule: ReminderRule | null, patch: ReminderRulePatch) =>
    write.mutate(
      {
        source: {
          ledgerId,
          sourceType,
          sourceId,
        },
        rule,
        patch,
        newId: crypto.randomUUID(),
      },
      { onSettled: () => queryClient.invalidateQueries({ queryKey: ledgerQueryKey('reminder-rules', ledgerId) }) },
    )

  return {
    rule: query.data,
    isLoading: query.isPending,
    isSaving: write.isPending,
    save,
  }
}
