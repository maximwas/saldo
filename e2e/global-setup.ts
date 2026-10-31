import { execSync } from 'node:child_process'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '../src/types/database.types'
import { DEMO } from './fixtures/demo-data.fixture'
import { E2E_PASSWORD, emailOf, ROLES, type Role } from './fixtures/users.fixture'

// One reset per run (transactions cannot wrap PostgREST calls); E2E_SKIP_RESET=1 reuses the seeded database
export default async function globalSetup() {
  if (process.env.E2E_SKIP_RESET === '1') {
    return
  }

  execSync('supabase db reset', { stdio: 'inherit' })

  const admin = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.SUPABASE_SECRET_KEY ?? '',
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  )
  const userIds = {} as Record<Role, string>

  for (const role of ROLES) {
    // createUser works with signups disabled; the trigger gives every user an own ledger
    const { data, error } = await admin.auth.admin.createUser({
      email: emailOf(role),
      password: E2E_PASSWORD,
      email_confirm: true,
    })

    if (error) {
      throw new Error(`e2e: createUser ${role} failed: ${error.message}`)
    }

    userIds[role] = data.user.id
  }

  const { data: settings, error: settingsError } = await admin
    .from('user_settings')
    .select('last_ledger_id')
    .eq('user_id', userIds.owner)
    .single()

  if (settingsError || !settings.last_ledger_id) {
    throw new Error(`e2e: owner ledger not found: ${settingsError?.message}`)
  }

  const ownerLedgerId = settings.last_ledger_id
  const steps = await Promise.all([
    admin.from('ledgers').update({ name: DEMO.ownerLedgerName }).eq('id', ownerLedgerId),
    admin
      .from('ledger_members')
      .update({ display_name: DEMO.ownerName })
      .eq('ledger_id', ownerLedgerId)
      .eq('user_id', userIds.owner),
    // the secret key bypasses RLS, so members join directly; the invite flow has its own e2e in phase 1
    admin.from('ledger_members').insert([
      {
        ledger_id: ownerLedgerId,
        user_id: userIds.editor,
        role: 'editor',
        display_name: DEMO.editorName,
      },
      {
        ledger_id: ownerLedgerId,
        user_id: userIds.viewer,
        role: 'viewer',
      },
    ]),
    // editor and viewer open the shared space, not their own one (user_settings.last_ledger_id is the default)
    admin
      .from('user_settings')
      .update({ last_ledger_id: ownerLedgerId })
      .in('user_id', [userIds.editor, userIds.viewer]),
    // two hryvnia accounts of docs/design/demo-data.md: the phase 1 specs add operations to them
    admin.from('accounts').insert([
      {
        ledger_id: ownerLedgerId,
        name: DEMO.cardName,
        kind: 'bank',
        currency: 'UAH',
        opening_balance_minor: DEMO.cardOpeningMinor,
        opening_balance_on: '2026-01-01',
        created_by: userIds.owner,
        sort_order: 1,
      },
      {
        ledger_id: ownerLedgerId,
        name: DEMO.savingsName,
        kind: 'savings',
        currency: 'UAH',
        opening_balance_minor: DEMO.savingsOpeningMinor,
        opening_balance_on: '2026-01-01',
        created_by: userIds.owner,
        sort_order: 2,
      },
    ]),
  ])
  const failed = steps.find((step) => step.error)

  if (failed?.error) {
    throw new Error(`e2e: demo data failed: ${failed.error.message}`)
  }
}
