import { admin } from './reminders.fixture'
import { kyivToday } from './subscriptions.fixture'
import { emailOf } from './users.fixture'

// the demo's NBU rates of yesterday and today (docs/design/demo-data.md), so the day's change shows; EUR also has
// today's manual 41,50, which beats NBU's 41,38
const NBU = [
  ['USD', 41.48, 41.6],
  ['EUR', 41.44, 41.38],
  ['PLN', 9.68, 9.65],
  ['GBP', 48.59, 48.8],
] as const

async function ownerLedgerId() {
  const { data, error } = await admin.auth.admin.listUsers()
  const owner = data?.users.find((user) => user.email === emailOf('owner'))

  if (error || !owner) {
    throw new Error(`e2e: owner not found: ${error?.message}`)
  }

  const settings = await admin.from('user_settings').select('last_ledger_id').eq('user_id', owner.id).single()

  if (settings.error || !settings.data.last_ledger_id) {
    throw new Error(`e2e: owner ledger not found: ${settings.error?.message}`)
  }

  return {
    ledgerId: settings.data.last_ledger_id,
    ownerId: owner.id,
  }
}

/** the rates the daily cron would have written, plus the manual EUR, and the owner's pins back at USD + EUR */
export async function seedRates() {
  const { ledgerId, ownerId } = await ownerLedgerId()
  const today = kyivToday()
  const yesterday = new Date(Date.parse(`${today}T12:00:00Z`) - 86_400_000).toISOString().slice(0, 10)
  const rows = NBU.flatMap(([currency, before, now]) => [
    {
      ledger_id: ledgerId,
      base_currency: currency,
      quote_currency: 'UAH',
      rate: before,
      rate_on: yesterday,
      source: 'reference',
      source_name: 'nbu',
    },
    {
      ledger_id: ledgerId,
      base_currency: currency,
      quote_currency: 'UAH',
      rate: now,
      rate_on: today,
      source: 'reference',
      source_name: 'nbu',
    },
  ])
  const steps = await Promise.all([
    admin.from('fx_rates').upsert(
      [
        ...rows,
        {
          ledger_id: ledgerId,
          base_currency: 'EUR',
          quote_currency: 'UAH',
          rate: 41.5,
          rate_on: today,
          source: 'manual',
          source_name: null,
        },
      ],
      { onConflict: 'ledger_id,base_currency,quote_currency,rate_on,source' },
    ),
    admin
      .from('ledger_members')
      .update({ pinned_currencies: ['USD', 'EUR'] })
      .eq('ledger_id', ledgerId)
      .eq('user_id', ownerId),
  ])

  for (const step of steps) {
    if (step.error) {
      throw new Error(`e2e: rates seed failed: ${step.error.message}`)
    }
  }
}
