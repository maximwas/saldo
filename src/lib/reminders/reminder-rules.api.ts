import type { SaldoClient } from '@/types/supabase.types'

export type ReminderSourceType = 'subscription' | 'credit' | 'debt'

export type ReminderRule = {
  id: string
  version: number
  offsetsDays: number[]
  enabled: boolean
}

export type ReminderSource = {
  ledgerId: string
  sourceType: ReminderSourceType
  sourceId: string
}

// null = the source has no rule yet (debts: §25 default is «none»)
export async function getReminderRule(supabase: SaldoClient, source: ReminderSource): Promise<ReminderRule | null> {
  const { data, error } = await supabase
    .from('reminder_rules')
    .select('id, version, offsets_days, enabled')
    .eq('ledger_id', source.ledgerId)
    .eq('source_type', source.sourceType)
    .eq('source_id', source.sourceId)
    .maybeSingle()

  if (error) {
    throw error
  }

  return (
    data && {
      id: data.id,
      version: data.version,
      offsetsDays: data.offsets_days,
      enabled: data.enabled,
    }
  )
}

export type ReminderRulePatch = {
  offsetsDays?: number[]
  enabled?: boolean
}

type SaveInput = {
  source: ReminderSource
  rule: ReminderRule | null
  patch: ReminderRulePatch
  newId: string
}

// No rule yet (debts start without one): the first switch or chip creates it, with the client's id
async function createRule(supabase: SaldoClient, input: SaveInput) {
  const { error } = await supabase.from('reminder_rules').insert({
    id: input.newId,
    ledger_id: input.source.ledgerId,
    source_type: input.source.sourceType,
    source_id: input.source.sourceId,
    offsets_days: input.patch.offsetsDays ?? [0],
    enabled: input.patch.enabled ?? true,
  })

  if (error) {
    throw error
  }
}

// An update carries the version it was read at: someone else's change in between is a conflict, not a silent overwrite
export async function saveReminderRule(supabase: SaldoClient, input: SaveInput) {
  if (!input.rule) {
    return createRule(supabase, input)
  }

  const { data, error } = await supabase
    .from('reminder_rules')
    .update({
      offsets_days: input.patch.offsetsDays,
      enabled: input.patch.enabled,
    })
    .eq('id', input.rule.id)
    .eq('version', input.rule.version)
    .select('id')

  if (error) {
    throw error
  }

  if (data.length === 0) {
    throw {
      code: 'PT409',
      message: 'stale reminder rule',
    }
  }
}
