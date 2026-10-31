import type { SaldoClient } from '@/types/supabase.types'

export type ReminderSourceType = 'subscription' | 'credit' | 'debt'

export type ReminderRule = {
  id: string
  version: number
  offsetsDays: number[]
  /** HH:mm in the space's time zone */
  atTime: string
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
    .select('id, version, offsets_days, at_time, enabled')
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
      atTime: data.at_time.slice(0, 5),
      enabled: data.enabled,
    }
  )
}

export type ReminderRulePatch = {
  offsetsDays?: number[]
  atTime?: string
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
    at_time: input.patch.atTime,
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
      at_time: input.patch.atTime,
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

const OPEN_STATES_LIMIT = 4

/** due dates of the source's next unpaid payments, soonest first: the reminders that have not fired yet belong to them */
export async function getUpcomingDueDates(supabase: SaldoClient, source: ReminderSource): Promise<string[]> {
  const { data, error } = await supabase
    .from('obligation_states')
    .select('due_on')
    .eq('ledger_id', source.ledgerId)
    .eq('source_type', source.sourceType)
    .eq('source_id', source.sourceId)
    .eq('lifecycle', 'active')
    .neq('state', 'paid')
    .order('due_on')
    .limit(OPEN_STATES_LIMIT)

  if (error) {
    throw error
  }

  return data.map((row) => row.due_on)
}

/** one line of «My reminders»: an enabled rule with the title and the due dates of its source */
export type MyReminder = {
  sourceType: ReminderSourceType
  sourceId: string
  title: string
  offsetsDays: number[]
  atTime: string
  dueDates: string[]
}

const SOURCE_TYPES: ReminderSourceType[] = ['subscription', 'credit', 'debt']

// Rules of the space joined with the unpaid obligations of their sources (the obligation carries the display title)
export async function listMyReminders(supabase: SaldoClient, ledgerId: string): Promise<MyReminder[]> {
  const [rules, states] = await Promise.all([
    supabase
      .from('reminder_rules')
      .select('source_type, source_id, offsets_days, at_time')
      .eq('ledger_id', ledgerId)
      .eq('enabled', true)
      .in('source_type', SOURCE_TYPES),
    supabase
      .from('obligation_states')
      .select('source_type, source_id, title, due_on')
      .eq('ledger_id', ledgerId)
      .eq('lifecycle', 'active')
      .neq('state', 'paid')
      .in('source_type', SOURCE_TYPES)
      .order('due_on'),
  ])

  if (rules.error) {
    throw rules.error
  }

  if (states.error) {
    throw states.error
  }

  return rules.data.flatMap((rule) => {
    const own = states.data.filter((state) => state.source_id === rule.source_id)

    // a source with nothing left to pay has no title to show and nothing to remind about
    return own.length === 0
      ? []
      : [
          {
            sourceType: rule.source_type as ReminderSourceType,
            sourceId: rule.source_id,
            title: own[0].title,
            offsetsDays: rule.offsets_days,
            atTime: rule.at_time.slice(0, 5),
            dueDates: own.map((state) => state.due_on),
          },
        ]
  })
}
